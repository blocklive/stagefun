import { NextResponse, NextRequest } from "next/server";
import { ethers } from "ethers";
import { getPoolContract } from "../../../../lib/contracts/StageDotFunPool";
import { supabase } from "../../../../lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Get the pool address from the request
    const body = await request.json();
    const { poolAddress, amount } = body;

    if (!poolAddress || !ethers.isAddress(poolAddress)) {
      return NextResponse.json(
        { error: "Invalid pool address" },
        { status: 400 }
      );
    }

    // Validate amount if provided
    let distributionAmount = 0;
    if (amount) {
      distributionAmount = parseFloat(amount);
      if (isNaN(distributionAmount) || distributionAmount <= 0) {
        return NextResponse.json(
          { error: "Invalid distribution amount" },
          { status: 400 }
        );
      }
    }

    // Get the private key from environment variables
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) {
      console.error("Blockchain private key not configured");
      return NextResponse.json(
        {
          error:
            "Distribution service not configured: Missing blockchain private key",
        },
        { status: 500 }
      );
    }

    // Get the provider based on the network
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
        ? "https://testnet-rpc.monad.xyz"
        : "https://sepolia.base.org"
    );

    // Create a wallet from the private key
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get the pool contract
    const poolContract = getPoolContract(wallet, poolAddress);

    // Get the pool details to verify there's revenue to distribute
    const poolDetails = await poolContract.getPoolDetails();

    console.log("Pool details:", {
      name: poolDetails._name,
      creator: poolDetails._creator,
      revenueAccumulated: poolDetails._revenueAccumulated.toString(),
    });

    // Check if there's revenue to distribute
    const revenueAccumulated = ethers.formatUnits(
      poolDetails._revenueAccumulated,
      6
    );

    if (parseFloat(revenueAccumulated) <= 0) {
      return NextResponse.json(
        { error: "No revenue to distribute" },
        { status: 400 }
      );
    }

    // Check if the requested amount is available
    if (distributionAmount > parseFloat(revenueAccumulated)) {
      return NextResponse.json(
        { error: "Requested amount exceeds available revenue" },
        { status: 400 }
      );
    }

    // Record the distribution request
    const { error: insertError } = await supabase
      .from("distribution_requests")
      .insert({
        pool_address: poolAddress,
        requested_at: new Date().toISOString(),
        status: "pending",
        amount:
          distributionAmount > 0
            ? distributionAmount.toString()
            : revenueAccumulated,
      });

    if (insertError) {
      console.error("Error recording distribution request:", insertError);
    }

    try {
      // First, check if we need to set the authorized withdrawer
      if (poolDetails._authorizedWithdrawer !== wallet.address) {
        const authTx = await poolContract.setAuthorizedWithdrawer(
          wallet.address
        );
        await authTx.wait();
        console.log("Set authorized withdrawer to server wallet");
      }

      // Distribute revenue to LPs
      const distributeTx = await poolContract.distributeRevenue();
      const receipt = await distributeTx.wait();
      const txHash = receipt.hash;
      console.log("Revenue distributed to LPs", { txHash });

      // Update the distribution request status
      const { error: updateError } = await supabase
        .from("distribution_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          tx_hash: txHash,
        })
        .eq("pool_address", poolAddress)
        .eq("status", "pending");

      if (updateError) {
        console.error("Error updating distribution request:", updateError);
      }

      return NextResponse.json({
        success: true,
        message: "Revenue distribution completed successfully",
        poolAddress,
        amount:
          distributionAmount > 0
            ? distributionAmount.toString()
            : revenueAccumulated,
        txHash,
        status: "completed",
      });
    } catch (error) {
      console.error("Error executing distribution:", error);

      // Update the distribution request status to failed
      const { error: updateError } = await supabase
        .from("distribution_requests")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq("pool_address", poolAddress)
        .eq("status", "pending");

      if (updateError) {
        console.error("Error updating distribution request:", updateError);
      }

      return NextResponse.json(
        {
          error: "Failed to distribute revenue",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in distribute-revenue API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
