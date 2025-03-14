import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
      "transactionHash",
      "poolAddress",
      "lpTokenAddress",
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

    const { poolId, transactionHash, poolAddress, lpTokenAddress } = body;

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

    // Determine the explorer URL based on the blockchain network
    const blockchainNetwork =
      process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK || "monad";
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
        blockchain_tx_hash: transactionHash,
        blockchain_status: "active",
        blockchain_explorer_url: `${explorerUrl}/tx/${transactionHash}`,
        contract_address: poolAddress,
        lp_token_address: lpTokenAddress,
      })
      .eq("id", poolId);

    if (updateError) {
      console.error("Error updating pool with blockchain info:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update pool in database",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      poolId,
      transactionHash,
      poolAddress,
      lpTokenAddress,
      explorerUrl: `${explorerUrl}/tx/${transactionHash}`,
    });
  } catch (error: any) {
    console.error("Error updating pool with blockchain info:", error);
    return NextResponse.json(
      {
        error: "Failed to update pool with blockchain info",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
