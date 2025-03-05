import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import { createPoolOnChain } from "@/lib/services/contract-service";

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Get pool data from request
    const { name, targetAmount, userId } = await req.json();

    if (!name || !targetAmount || !userId) {
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

    // Set up provider and wallet
    const rpcUrl =
      process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(
      process.env.BLOCKCHAIN_PRIVATE_KEY!,
      provider
    );

    console.log("Creating pool on chain...");
    const { receipt, poolId, lpTokenAddress } = await createPoolOnChain(
      wallet,
      name
    );
    console.log("Pool created with ID:", poolId);
    console.log("LP token deployed at:", lpTokenAddress);

    // Create the pool in the database
    const { data: pool, error: createError } = await supabaseAdmin
      .from("pools")
      .insert({
        id: poolId,
        name: name,
        creator_id: userId,
        target_amount: targetAmount,
        blockchain_tx_hash: receipt.hash,
        blockchain_status: "confirmed",
        blockchain_network: "monad",
        blockchain_block_number: receipt.blockNumber,
        blockchain_explorer_url: `https://testnet.monadexplorer.com/tx/${receipt.hash}`,
        lp_token_address: lpTokenAddress,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating pool in database:", createError);
      return NextResponse.json(
        { error: "Failed to create pool in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pool: pool,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      poolId: poolId,
    });
  } catch (error: any) {
    console.error("Error creating pool:", error);
    return NextResponse.json(
      {
        error: "Failed to create pool",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
