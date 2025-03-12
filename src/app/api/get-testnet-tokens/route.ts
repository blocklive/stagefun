import { NextResponse, NextRequest } from "next/server";
import { ethers } from "ethers";
import { getUSDCContract } from "../../../lib/contracts/StageDotFunPool";
import { supabase } from "../../../lib/supabase";

// Amount of USDC to send (0.1 USDC = 100000 in USDC's 6 decimal format)
const USDC_AMOUNT = BigInt(100000);

// Amount of MON to send (0.1 MON = 0.1 * 10^18)
const MON_AMOUNT = ethers.parseEther("0.1");

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

    // If there are too many requests from this IP (more than 5 in 24 hours)
    if (ipRequests && ipRequests.length >= 5) {
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
    const faucetUsdcBalance = await usdcContract.balanceOf(wallet.address);
    const faucetMonBalance = await provider.getBalance(wallet.address);

    if (faucetUsdcBalance < USDC_AMOUNT) {
      console.error("Faucet has insufficient USDC funds", {
        faucetAddress: wallet.address,
        faucetBalance: faucetUsdcBalance.toString(),
        requestedAmount: USDC_AMOUNT.toString(),
      });

      return NextResponse.json(
        { error: "Faucet has insufficient USDC funds" },
        { status: 500 }
      );
    }

    if (faucetMonBalance < MON_AMOUNT) {
      console.error("Faucet has insufficient MON funds", {
        faucetAddress: wallet.address,
        faucetBalance: faucetMonBalance.toString(),
        requestedAmount: MON_AMOUNT.toString(),
      });

      return NextResponse.json(
        { error: "Faucet has insufficient MON funds" },
        { status: 500 }
      );
    }

    // Transfer USDC to the user's wallet
    const usdcTx = await usdcContract.transfer(walletAddress, USDC_AMOUNT);

    // Wait for the USDC transaction to be mined
    const usdcReceipt = await usdcTx.wait();

    if (!usdcReceipt) {
      throw new Error("Failed to get USDC transaction receipt");
    }

    console.log("USDC transfer successful", {
      txHash: usdcReceipt.hash,
      recipient: walletAddress,
      amount: USDC_AMOUNT.toString(),
    });

    // Transfer MON (native currency) to the user's wallet
    const monTx = await wallet.sendTransaction({
      to: walletAddress,
      value: MON_AMOUNT,
    });

    // Wait for the MON transaction to be mined
    const monReceipt = await monTx.wait();

    if (!monReceipt) {
      throw new Error("Failed to get MON transaction receipt");
    }

    console.log("MON transfer successful", {
      txHash: monReceipt.hash,
      recipient: walletAddress,
      amount: ethers.formatEther(MON_AMOUNT),
    });

    // Record this request in the database
    try {
      const { error: insertError } = await supabase
        .from("faucet_requests")
        .insert({
          wallet_address: walletAddress.toLowerCase(),
          ip_address: ip,
          tx_hash: usdcReceipt.hash,
          amount: USDC_AMOUNT.toString(),
          mon_tx_hash: monReceipt.hash,
          mon_amount: MON_AMOUNT.toString(),
        });

      if (insertError) {
        console.error("Error recording faucet request:", insertError);

        // If the error is due to missing columns, try inserting without the MON fields
        if (
          insertError.message.includes("column") &&
          insertError.message.includes("does not exist")
        ) {
          console.log(
            "Trying to insert without MON fields (schema might not be updated yet)"
          );
          const { error: fallbackInsertError } = await supabase
            .from("faucet_requests")
            .insert({
              wallet_address: walletAddress.toLowerCase(),
              ip_address: ip,
              tx_hash: usdcReceipt.hash,
              amount: USDC_AMOUNT.toString(),
            });

          if (fallbackInsertError) {
            console.error(
              "Error recording faucet request (fallback):",
              fallbackInsertError
            );
          }
        }
      }
    } catch (dbError) {
      console.error("Database error when recording faucet request:", dbError);
      // Continue anyway, the transfers were successful
    }

    return NextResponse.json({
      success: true,
      usdcTxHash: usdcReceipt.hash,
      usdcAmount: USDC_AMOUNT.toString(),
      monTxHash: monReceipt.hash,
      monAmount: ethers.formatEther(MON_AMOUNT),
    });
  } catch (error) {
    console.error("Error sending tokens:", error);

    return NextResponse.json(
      { error: "Failed to send tokens" },
      { status: 500 }
    );
  }
}
