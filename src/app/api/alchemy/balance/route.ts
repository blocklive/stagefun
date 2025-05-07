import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

// Alchemy API configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

/**
 * Fetch native token balance for a wallet address using Alchemy API
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const chainId = searchParams.get("chainId") || "monad-test-v2";

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    if (!ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: "Alchemy API key not configured" },
        { status: 500 }
      );
    }

    // Construct the correct Alchemy API URL based on chain ID
    const baseUrl = getAlchemyBaseUrl(chainId);

    // Request the native balance
    const balanceUrl = `${baseUrl}/${ALCHEMY_API_KEY}`;
    const balancePayload = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    };

    const balanceResponse = await fetch(balanceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(balancePayload),
    });

    if (!balanceResponse.ok) {
      const errorText = await balanceResponse.text();
      console.error(
        `Alchemy API error: ${balanceResponse.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: `Failed to fetch balance: ${balanceResponse.statusText}` },
        { status: balanceResponse.status }
      );
    }

    const balanceData = await balanceResponse.json();
    const balanceHex = balanceData.result || "0x0";

    // Convert hex balance to decimal string using ethers.js
    const balanceWei = BigInt(balanceHex);
    const balanceEth = ethers.formatEther(balanceWei);

    return NextResponse.json({
      balance: balanceEth,
      balanceWei: balanceWei.toString(),
      symbol: getNativeSymbol(chainId),
    });
  } catch (error) {
    console.error("Error fetching native balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch native balance from Alchemy" },
      { status: 500 }
    );
  }
}

/**
 * Get the Alchemy base URL for a given chain ID
 */
function getAlchemyBaseUrl(chainId: string): string {
  switch (chainId) {
    case "eth-mainnet":
      return "https://eth-mainnet.g.alchemy.com/v2";
    case "eth-sepolia":
      return "https://eth-sepolia.g.alchemy.com/v2";
    case "polygon-mainnet":
      return "https://polygon-mainnet.g.alchemy.com/v2";
    case "polygon-mumbai":
      return "https://polygon-mumbai.g.alchemy.com/v2";
    case "opt-mainnet":
      return "https://opt-mainnet.g.alchemy.com/v2";
    case "arb-mainnet":
      return "https://arb-mainnet.g.alchemy.com/v2";
    case "monad-test-v2":
      return "https://monad-testnet.g.alchemy.com/v2";
    default:
      return "https://eth-mainnet.g.alchemy.com/v2";
  }
}

/**
 * Get the native token symbol for a given chain ID
 */
function getNativeSymbol(chainId: string): string {
  switch (chainId) {
    case "eth-mainnet":
    case "eth-sepolia":
      return "ETH";
    case "polygon-mainnet":
    case "polygon-mumbai":
      return "MATIC";
    case "monad-test-v2":
      return "MON";
    case "opt-mainnet":
      return "ETH";
    case "arb-mainnet":
      return "ETH";
    default:
      return "ETH";
  }
}
