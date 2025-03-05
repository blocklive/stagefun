import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import {
  getStageDotFunPoolContract,
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
    const { poolId, userId } = await req.json();

    if (!poolId || !userId) {
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

    // Set up provider and wallet for the backend
    const rpcUrl =
      process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
        ? "https://testnet-rpc.monad.xyz"
        : "https://sepolia.base.org";

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(
      process.env.BLOCKCHAIN_PRIVATE_KEY,
      provider
    );
    const contract = getStageDotFunPoolContract(wallet);

    // Generate the correct pool ID from the pool name
    const bytes32PoolId = getPoolId(pool.name);
    console.log("Activating pool:", pool.name);
    console.log("Pool ID:", bytes32PoolId);

    // Call updatePoolStatus with PoolStatus.ACTIVE (1)
    const tx = await contract.updatePoolStatus(bytes32PoolId, 1);
    const receipt = await tx.wait();
    console.log("Pool activated in block:", receipt.blockNumber);

    // Update the pool status in the database
    const { error: updateError } = await supabaseAdmin
      .from("pools")
      .update({
        blockchain_status: "active",
        blockchain_tx_hash: receipt.hash,
        blockchain_block_number: receipt.blockNumber,
      })
      .eq("id", poolId);

    if (updateError) {
      console.error("Error updating pool status:", updateError);
    }

    // Return the transaction receipt
    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error) {
    console.error("Error activating pool:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
