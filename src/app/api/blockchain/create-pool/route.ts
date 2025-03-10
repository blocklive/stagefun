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
    const body = await req.json();
    console.log("Received request body:", body);

    // Validate all required parameters
    const requiredParams = [
      "poolId",
      "name",
      "uniqueId",
      "symbol",
      "endTime",
      "targetAmount",
      "minCommitment",
    ];
    const missingParams = requiredParams.filter((param) => !body[param]);

    if (missingParams.length > 0) {
      console.error(`Missing required parameters: ${missingParams.join(", ")}`);
      return NextResponse.json(
        {
          error: "Missing required parameters",
          details: `Missing: ${missingParams.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const {
      poolId,
      name,
      uniqueId,
      symbol,
      endTime,
      targetAmount,
      minCommitment,
    } = body;

    // Additional validation
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Invalid name parameter",
          details: "Name must be a non-empty string",
        },
        { status: 400 }
      );
    }

    if (typeof uniqueId !== "string" || uniqueId.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Invalid uniqueId parameter",
          details: "Unique ID must be a non-empty string",
        },
        { status: 400 }
      );
    }

    if (typeof symbol !== "string" || symbol.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Invalid symbol parameter",
          details: "Symbol must be a non-empty string",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(Number(endTime)) ||
      Number(endTime) <= Date.now() / 1000
    ) {
      return NextResponse.json(
        {
          error: "Invalid endTime parameter",
          details: "End time must be a future timestamp",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(Number(targetAmount)) || Number(targetAmount) <= 0) {
      return NextResponse.json(
        {
          error: "Invalid targetAmount parameter",
          details: "Target amount must be a positive number",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(Number(minCommitment)) || Number(minCommitment) <= 0) {
      return NextResponse.json(
        {
          error: "Invalid minCommitment parameter",
          details: "Minimum commitment must be a positive number",
        },
        { status: 400 }
      );
    }

    // Verify that the pool exists in the database
    const { data: pool, error: dbError } = await supabaseAdmin
      .from("pools")
      .select("*")
      .eq("id", poolId)
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Database error", details: dbError.message },
        { status: 500 }
      );
    }

    if (!pool) {
      return NextResponse.json(
        { error: "Pool not found in database" },
        { status: 404 }
      );
    }

    // Check if the pool already has a contract address
    if (pool.contract_address) {
      return NextResponse.json(
        {
          error: "Pool already deployed",
          details: "This pool has already been deployed to the blockchain",
        },
        { status: 400 }
      );
    }

    // Check if the required environment variables are set
    if (!process.env.BLOCKCHAIN_PRIVATE_KEY) {
      console.error("BLOCKCHAIN_PRIVATE_KEY environment variable is not set");
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "Missing blockchain configuration",
        },
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

    console.log(`Using RPC URL: ${rpcUrl} for network: ${blockchainNetwork}`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY!;
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Using wallet address: ${wallet.address}`);

    // Get the factory contract
    const factory = getStageDotFunPoolFactoryContract(wallet);

    // Create the pool on the blockchain
    console.log(
      `Creating pool: ${name} (${symbol}) with uniqueId ${uniqueId}, end time ${endTime}, target amount ${targetAmount}, min commitment ${minCommitment}`
    );
    const tx = await factory.createPool(
      name,
      uniqueId,
      symbol,
      BigInt(endTime),
      BigInt(targetAmount), // Already in base units from frontend
      BigInt(minCommitment) // Already in base units from frontend
    );
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

    // Get pool address and LP token address from the event
    const event = receipt.logs.find(
      (log: any) => log.eventName === "PoolCreated"
    );

    if (!event) {
      throw new Error("PoolCreated event not found in transaction receipt");
    }

    const poolAddress = event.args.poolAddress;
    const lpTokenAddress = event.args.lpTokenAddress;
    const eventUniqueId = event.args.uniqueId;

    if (!poolAddress || !lpTokenAddress) {
      throw new Error("Missing pool or LP token address from event");
    }

    // Verify that the uniqueId in the event matches the one we sent
    if (eventUniqueId !== uniqueId) {
      console.warn(
        `UniqueId mismatch: sent ${uniqueId}, received ${eventUniqueId}`
      );
    }

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
        contract_address: poolAddress,
        lp_token_address: lpTokenAddress,
      })
      .eq("id", poolId);

    if (updateError) {
      console.error("Error updating pool with blockchain info:", updateError);
      throw new Error(
        `Failed to update pool in database: ${updateError.message}`
      );
    }

    // Return the transaction receipt and pool addresses
    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      poolAddress: poolAddress,
      lpTokenAddress: lpTokenAddress,
      uniqueId: eventUniqueId,
      explorerUrl: `${explorerUrl}/tx/${receipt.hash}`,
    });
  } catch (error: any) {
    console.error("Error creating pool on blockchain:", error);
    return NextResponse.json(
      {
        error: "Failed to create pool on blockchain",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
