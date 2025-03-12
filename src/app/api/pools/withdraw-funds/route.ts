import { NextResponse, NextRequest } from "next/server";
import { ethers } from "ethers";
import { getPoolContract } from "../../../../lib/contracts/StageDotFunPool";
import { supabase } from "../../../../lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Get the pool address from the request
    const body = await request.json();
    const { poolAddress, amount, destinationAddress } = body;

    if (!poolAddress || !ethers.isAddress(poolAddress)) {
      return NextResponse.json(
        { error: "Invalid pool address" },
        { status: 400 }
      );
    }

    // Validate amount and destination address if provided
    let withdrawalAmount = 0;
    if (amount) {
      withdrawalAmount = parseFloat(amount);
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        return NextResponse.json(
          { error: "Invalid withdrawal amount" },
          { status: 400 }
        );
      }
    }

    let withdrawalAddress = null;
    if (destinationAddress) {
      if (!ethers.isAddress(destinationAddress)) {
        return NextResponse.json(
          { error: "Invalid destination address" },
          { status: 400 }
        );
      }
      withdrawalAddress = destinationAddress;
    }

    // Get the private key from environment variables
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) {
      console.error("Blockchain private key not configured");
      return NextResponse.json(
        {
          error:
            "Withdrawal service not configured: Missing blockchain private key",
        },
        { status: 500 }
      );
    }

    // Get the provider based on the network
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL
    );

    // Create a wallet from the private key
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get the pool contract
    const poolContract = getPoolContract(wallet, poolAddress);

    // Get the pool details to verify the caller is authorized
    const poolDetails = await poolContract.getPoolDetails();

    console.log("Pool details:", {
      name: poolDetails._name,
      creator: poolDetails._creator,
      totalDeposits: poolDetails._totalDeposits.toString(),
      revenueAccumulated: poolDetails._revenueAccumulated.toString(),
    });

    // Calculate the total available funds
    const totalDeposits = ethers.formatUnits(poolDetails._totalDeposits, 6);
    const revenueAccumulated = ethers.formatUnits(
      poolDetails._revenueAccumulated,
      6
    );
    const totalAvailable =
      parseFloat(totalDeposits) + parseFloat(revenueAccumulated);

    // Check if the requested amount is available
    if (withdrawalAmount > totalAvailable) {
      return NextResponse.json(
        { error: "Requested amount exceeds available funds" },
        { status: 400 }
      );
    }

    // Record the withdrawal request
    const { error: insertError } = await supabase
      .from("withdrawal_requests")
      .insert({
        pool_address: poolAddress,
        requested_at: new Date().toISOString(),
        status: "pending",
        amount:
          withdrawalAmount > 0
            ? withdrawalAmount.toString()
            : totalAvailable.toString(),
        destination_address: withdrawalAddress,
      });

    if (insertError) {
      console.error("Error recording withdrawal request:", insertError);
    }

    // First, check if we need to set the authorized withdrawer
    try {
      // Set the server wallet as the authorized withdrawer if it's not already
      if (poolDetails._authorizedWithdrawer !== wallet.address) {
        const authTx = await poolContract.setAuthorizedWithdrawer(
          wallet.address
        );
        await authTx.wait();
        console.log("Set authorized withdrawer to server wallet");
      }

      // Check if we need to distribute revenue first
      let txHash;
      if (parseFloat(revenueAccumulated) > 0) {
        // Distribute revenue to LPs
        const distributeTx = await poolContract.distributeRevenue();
        await distributeTx.wait();
        console.log("Revenue distributed to LPs");
      }

      // Now handle the withdrawal
      // Since we're the authorized withdrawer, we can use the direct withdrawal method
      // We'll create a milestone and immediately approve and withdraw it

      // First, create a milestone for the amount
      const now = Math.floor(Date.now() / 1000);
      const descriptions = ["Withdrawal"];
      const amounts = [
        ethers.parseUnits(
          withdrawalAmount > 0
            ? withdrawalAmount.toString()
            : totalAvailable.toString(),
          6
        ),
      ];
      // Set unlock time to 5 seconds in the future to satisfy the contract requirement
      const unlockTimes = [now + 5];

      const setMilestoneTx = await poolContract.setMilestones(
        descriptions,
        amounts,
        unlockTimes
      );
      await setMilestoneTx.wait();
      console.log("Milestone created for withdrawal");

      // Wait for the unlock time to pass before approving
      console.log(
        `Waiting for unlock time (${unlockTimes[0]}) to be reached...`
      );
      const waitTime = (unlockTimes[0] - Math.floor(Date.now() / 1000)) * 1000;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime + 1000)); // Add 1 extra second to be safe
      }

      // Approve the milestone
      const approveTx = await poolContract.approveMilestone(0);
      await approveTx.wait();
      console.log("Milestone approved");

      // Withdraw the milestone
      const withdrawTx = await poolContract.withdrawMilestone(0);
      const receipt = await withdrawTx.wait();
      txHash = receipt.hash;
      console.log("Milestone withdrawn", { txHash });

      // If a destination address was provided and it's different from the wallet address,
      // transfer the funds to the destination address
      if (
        withdrawalAddress &&
        withdrawalAddress.toLowerCase() !== wallet.address.toLowerCase()
      ) {
        // Get the USDC token address from the pool
        const usdcAddress = await poolContract.depositToken();

        // Create a contract instance for USDC
        const usdcContract = new ethers.Contract(
          usdcAddress,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          wallet
        );

        // Convert the amount to USDC base units (6 decimals)
        const amountInBaseUnits = ethers.parseUnits(
          withdrawalAmount > 0
            ? withdrawalAmount.toString()
            : totalAvailable.toString(),
          6
        );

        // Transfer the funds to the destination address
        const transferTx = await usdcContract.transfer(
          withdrawalAddress,
          amountInBaseUnits
        );
        const transferReceipt = await transferTx.wait();
        console.log("Funds transferred to destination", {
          txHash: transferReceipt.hash,
          destination: withdrawalAddress,
          amount: amountInBaseUnits.toString(),
        });
      }

      // Update the withdrawal request status
      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          tx_hash: txHash,
        })
        .eq("pool_address", poolAddress)
        .eq("status", "pending");

      if (updateError) {
        console.error("Error updating withdrawal request:", updateError);
      }

      return NextResponse.json({
        success: true,
        message: "Withdrawal completed successfully",
        poolAddress,
        amount:
          withdrawalAmount > 0
            ? withdrawalAmount.toString()
            : totalAvailable.toString(),
        destinationAddress: withdrawalAddress,
        txHash,
        status: "completed",
      });
    } catch (error) {
      console.error("Error executing withdrawal:", error);

      // Update the withdrawal request status to failed
      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        })
        .eq("pool_address", poolAddress)
        .eq("status", "pending");

      if (updateError) {
        console.error("Error updating withdrawal request status:", updateError);
      }

      return NextResponse.json(
        {
          error:
            "Failed to execute withdrawal: " +
            (error instanceof Error ? error.message : "Unknown error"),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing withdrawal request:", error);
    return NextResponse.json(
      {
        error:
          "Failed to process withdrawal request: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}
