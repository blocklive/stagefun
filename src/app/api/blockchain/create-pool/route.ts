import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import {
  getPoolCommitmentContract,
  parseUSDC,
} from "@/lib/contracts/PoolCommitment";

// Initialize Supabase admin client for verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Get pool data from request
    const { poolId, targetAmount, userId } = await req.json();

    if (!poolId || !targetAmount || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Validate target amount
    if (isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
      return NextResponse.json(
        { error: "Target amount must be a positive number" },
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
    // Use environment-specific RPC URL based on the selected blockchain
    let rpcUrl;

    if (blockchainNetwork === "monad") {
      rpcUrl =
        process.env.NODE_ENV === "production"
          ? process.env.MONAD_MAINNET_RPC_URL || "https://rpc.monad.xyz"
          : process.env.MONAD_TESTNET_RPC_URL ||
            "https://testnet-rpc.monad.xyz";
    } else if (
      blockchainNetwork === "hardhat" ||
      blockchainNetwork === "localhost"
    ) {
      // Use local Hardhat node
      rpcUrl = "http://127.0.0.1:8545";
    } else {
      // Fallback to Base
      rpcUrl =
        process.env.NODE_ENV === "production"
          ? process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
          : "http://127.0.0.1:8545"; // Local Hardhat node for development
    }

    console.log(`Using RPC URL: ${rpcUrl} for network: ${blockchainNetwork}`);

    // Create provider with simpler configuration to avoid type errors
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Set a reasonable timeout for requests
    provider.pollingInterval = 4000; // 4 seconds polling interval

    // Test the connection to the provider
    try {
      console.log("Testing connection to blockchain provider...");
      const blockNumber = await provider.getBlockNumber();
      console.log(
        `Successfully connected to blockchain. Current block: ${blockNumber}`
      );
    } catch (connectionError) {
      console.error(
        "Failed to connect to blockchain provider:",
        connectionError
      );

      // Update the pool with error status
      await supabaseAdmin
        .from("pools")
        .update({
          blockchain_status: "failed",
          blockchain_network: blockchainNetwork,
        })
        .eq("id", poolId);

      return NextResponse.json(
        {
          error: "Failed to connect to blockchain provider",
          details:
            connectionError instanceof Error
              ? connectionError.message
              : String(connectionError),
          network: blockchainNetwork,
          rpcUrl: rpcUrl,
        },
        { status: 503 }
      );
    }

    // In production, you would use an environment variable for the private key
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY!;

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Using wallet address: ${wallet.address}`);

    // Get the contract
    const contract = getPoolCommitmentContract(wallet);

    // Convert target amount to the correct format (USDC has 6 decimals)
    const targetAmountWei = parseUSDC(targetAmount.toString());

    // Create the pool on the blockchain
    console.log(
      `Creating pool ${poolId} with target amount ${targetAmountWei} on ${blockchainNetwork}`
    );
    const tx = await contract.createPool(poolId, targetAmountWei);
    console.log("Transaction sent:", tx.hash);

    // Update the pool in the database with pending blockchain information
    await supabaseAdmin
      .from("pools")
      .update({
        blockchain_tx_hash: tx.hash,
        blockchain_status: "pending",
        blockchain_network: blockchainNetwork,
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
      explorerUrl = "http://localhost:8545"; // Local explorer not typically available
    } else {
      explorerUrl = "https://sepolia.etherscan.io";
    }

    // Update the pool in the database with blockchain information
    const { error: updateError } = await supabaseAdmin
      .from("pools")
      .update({
        blockchain_tx_hash: receipt.hash,
        blockchain_block_number: receipt.blockNumber,
        blockchain_status: "confirmed",
        blockchain_network: blockchainNetwork,
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
    });
  } catch (error: any) {
    console.error("Error creating pool on blockchain:", error);

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
        error: "Failed to create pool on blockchain",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
