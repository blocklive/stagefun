import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import {
  getStageDotFunPoolFactoryContract,
  getPoolContract,
  getPoolId,
} from "@/lib/contracts/StageDotFunPool";

// Initialize Supabase admin client for verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Get pool data from request
    const { poolId, userId, status } = await req.json();

    if (!poolId || !userId || status === undefined) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify that the pool exists and belongs to the user
    const { data: pool, error } = await supabaseAdmin
      .from("pools")
      .select("*")
      .eq("id", poolId)
      .eq("creator_id", userId)
      .single();

    if (error || !pool) {
      return NextResponse.json(
        { error: "Pool not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if the required environment variables are set
    if (!process.env.BLOCKCHAIN_PRIVATE_KEY) {
      console.error("BLOCKCHAIN_PRIVATE_KEY environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Determine which blockchain network to use based on environment
    const blockchainNetwork =
      process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK || "monad";

    // Set up provider and wallet for the backend
    let rpcUrl;
    if (blockchainNetwork === "monad") {
      rpcUrl = "https://testnet-rpc.monad.xyz";
    } else if (
      blockchainNetwork === "hardhat" ||
      blockchainNetwork === "localhost"
    ) {
      rpcUrl = "http://127.0.0.1:8545";
    } else {
      rpcUrl = "https://sepolia.base.org";
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY!;
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Using wallet address: ${wallet.address}`);

    // Get the pool contract directly
    const poolContract = getPoolContract(wallet, pool.contract_address);

    console.log(
      `Updating pool status for ${pool.name} (${pool.contract_address}) to ${status}`
    );

    // Update the pool status by calling the pool contract directly
    const tx = await poolContract.updateStatus(status === "active" ? 1 : 0);
    console.log("Transaction sent:", tx.hash);

    // Update the pool in the database with pending blockchain information
    await supabaseAdmin
      .from("pools")
      .update({
        blockchain_tx_hash: tx.hash,
        blockchain_status: "pending",
      })
      .eq("id", poolId);

    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Determine the explorer URL based on the blockchain network
    let explorerUrl;
    if (blockchainNetwork === "monad") {
      explorerUrl =
        process.env.NODE_ENV === "production"
          ? "https://monadexplorer.com"
          : "https://testnet.monadexplorer.com";
    } else if (
      blockchainNetwork === "hardhat" ||
      blockchainNetwork === "localhost"
    ) {
      explorerUrl = "http://localhost:8545";
    } else {
      explorerUrl = "https://sepolia.etherscan.io";
    }

    // Update the pool in the database with blockchain information
    const { error: updateError } = await supabaseAdmin
      .from("pools")
      .update({
        blockchain_tx_hash: receipt.hash,
        blockchain_block_number: receipt.blockNumber,
        blockchain_status: status === "active" ? "active" : "inactive",
        blockchain_explorer_url: `${explorerUrl}/tx/${receipt.hash}`,
      })
      .eq("id", poolId);

    if (updateError) {
      console.error("Error updating pool with blockchain info:", updateError);
    }

    // Return the transaction receipt
    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      network: blockchainNetwork,
      explorerUrl: `${explorerUrl}/tx/${receipt.hash}`,
      status: status === "active" ? "active" : "inactive",
    });
  } catch (error: any) {
    console.error("Error updating pool status:", error);

    // Provide more specific error messages based on the error type
    if (error.code === "NETWORK_ERROR" || error.message?.includes("network")) {
      return NextResponse.json(
        { error: "Blockchain network error", details: error.message },
        { status: 503 }
      );
    } else if (error.code === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { error: "Insufficient funds for transaction", details: error.message },
        { status: 500 }
      );
    } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      return NextResponse.json(
        { error: "Contract error", details: error.message },
        { status: 500 }
      );
    } else if (error.message?.includes("timeout")) {
      return NextResponse.json(
        { error: "Blockchain request timed out", details: error.message },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update pool status",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
