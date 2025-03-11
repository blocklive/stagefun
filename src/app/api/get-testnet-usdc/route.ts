import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { getUSDCContract } from "../../../lib/contracts/StageDotFunPool";

// Amount of USDC to send (0.1 USDC = 100000 in USDC's 6 decimal format)
const USDC_AMOUNT = BigInt(100000);

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Get the provider based on the network
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
        ? "https://testnet-rpc.monad.xyz"
        : "https://sepolia.base.org"
    );

    // Get the private key from environment variables
    const privateKey = process.env.FAUCET_PRIVATE_KEY;
    if (!privateKey) {
      console.error("Faucet private key not configured");
      return NextResponse.json(
        { error: "Faucet not configured" },
        { status: 500 }
      );
    }

    // Create a wallet from the private key
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get the USDC contract
    const usdcContract = getUSDCContract(wallet);

    // Check the faucet wallet's balance
    const faucetBalance = await usdcContract.balanceOf(wallet.address);

    if (faucetBalance < USDC_AMOUNT) {
      console.error("Faucet has insufficient funds", {
        faucetAddress: wallet.address,
        faucetBalance: faucetBalance.toString(),
        requestedAmount: USDC_AMOUNT.toString(),
      });

      return NextResponse.json(
        { error: "Faucet has insufficient funds" },
        { status: 500 }
      );
    }

    // Transfer USDC to the user's wallet
    const tx = await usdcContract.transfer(walletAddress, USDC_AMOUNT);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    console.log("USDC transfer successful", {
      txHash: receipt.hash,
      recipient: walletAddress,
      amount: USDC_AMOUNT.toString(),
    });

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      amount: USDC_AMOUNT.toString(),
    });
  } catch (error) {
    console.error("Error sending USDC:", error);

    return NextResponse.json({ error: "Failed to send USDC" }, { status: 500 });
  }
}
