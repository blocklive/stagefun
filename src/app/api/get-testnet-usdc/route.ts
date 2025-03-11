import { NextResponse, NextRequest } from "next/server";
import { ethers } from "ethers";
import { getUSDCContract } from "../../../lib/contracts/StageDotFunPool";
import { supabase } from "../../../lib/supabase";

// Amount of USDC to send (0.1 USDC = 100000 in USDC's 6 decimal format)
const USDC_AMOUNT = BigInt(100000);

// Rate limit: 24 hours in milliseconds
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Get IP address for additional rate limiting
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown";

    // Check if this wallet has requested tokens recently
    const { data: existingRequests, error: fetchError } = await supabase
      .from("faucet_requests")
      .select("created_at")
      .eq("wallet_address", walletAddress.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error checking faucet requests:", fetchError);
      return NextResponse.json(
        { error: "Error checking request history" },
        { status: 500 }
      );
    }

    // If there's a recent request, check if it's within the rate limit period
    if (existingRequests && existingRequests.length > 0) {
      const lastRequest = new Date(existingRequests[0].created_at);
      const now = new Date();
      const timeSinceLastRequest = now.getTime() - lastRequest.getTime();

      if (timeSinceLastRequest < RATE_LIMIT_MS) {
        const hoursRemaining = Math.ceil(
          (RATE_LIMIT_MS - timeSinceLastRequest) / (60 * 60 * 1000)
        );
        return NextResponse.json(
          {
            error: `Rate limit exceeded. Please try again later.`,
            waitTime: `Try again in ${hoursRemaining} hour${
              hoursRemaining > 1 ? "s" : ""
            }.`,
          },
          { status: 429 }
        );
      }
    }

    // Also check IP-based rate limiting as a secondary measure
    const { data: ipRequests, error: ipFetchError } = await supabase
      .from("faucet_requests")
      .select("created_at")
      .eq("ip_address", ip)
      .gt("created_at", new Date(Date.now() - RATE_LIMIT_MS).toISOString())
      .order("created_at", { ascending: false });

    if (ipFetchError) {
      console.error("Error checking IP-based requests:", ipFetchError);
      // Continue anyway, this is just a secondary check
    }

    // If there are too many requests from this IP (more than 3 in 24 hours)
    if (ipRequests && ipRequests.length >= 3) {
      return NextResponse.json(
        { error: "Too many requests from this IP address" },
        { status: 429 }
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

    // Record this request in the database
    const { error: insertError } = await supabase
      .from("faucet_requests")
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        ip_address: ip,
        tx_hash: receipt.hash,
        amount: USDC_AMOUNT.toString(),
      });

    if (insertError) {
      console.error("Error recording faucet request:", insertError);
      // Continue anyway, the transfer was successful
    }

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
