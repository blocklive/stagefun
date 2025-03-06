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
    const { poolId } = await req.json();

    if (!poolId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify that the pool exists in the database
    const { data: pool, error } = await supabaseAdmin
      .from("pools")
      .select("*")
      .eq("id", poolId)
      .single();

    if (error || !pool) {
      return NextResponse.json(
        { error: "Pool not found in database" },
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

    // Get the factory contract
    const factory = getStageDotFunPoolFactoryContract(wallet);

    // Get pool address from name
    const poolAddress = await factory.getPoolByName(pool.name);
    if (!poolAddress) {
      throw new Error("Pool not found on blockchain");
    }

    // Activate the pool
    console.log(`Activating pool: ${pool.name} at address ${poolAddress}`);
    const tx = await factory.updatePoolStatus(poolAddress, 1); // 1 = active
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
        blockchain_status: "active",
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
      status: "active",
    });
  } catch (error: any) {
    console.error("Error activating pool:", error);

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
        error: "Failed to activate pool",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
