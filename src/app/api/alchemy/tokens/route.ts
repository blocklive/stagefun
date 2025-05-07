import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

// Alchemy API configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string | null;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

/**
 * Fetch token balances for a wallet address using Alchemy API
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

    // 1. First get token balances
    const balancesUrl = `${baseUrl}/${ALCHEMY_API_KEY}`;
    const balancesPayload = {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getTokenBalances",
      params: [address, "erc20"],
    };

    const balancesResponse = await fetch(balancesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(balancesPayload),
    });

    if (!balancesResponse.ok) {
      const errorText = await balancesResponse.text();
      console.error(
        `Alchemy API error: ${balancesResponse.status} - ${errorText}`
      );
      return NextResponse.json(
        {
          error: `Failed to fetch token balances: ${balancesResponse.statusText}`,
        },
        { status: balancesResponse.status }
      );
    }

    const balancesData = await balancesResponse.json();
    const tokenBalances: TokenBalance[] = balancesData.result.tokenBalances;

    // 2. Get native balance
    const nativeBalanceResponse = await fetch(balancesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    });

    let nativeBalance = "0";
    if (nativeBalanceResponse.ok) {
      const nativeBalanceData = await nativeBalanceResponse.json();
      nativeBalance = nativeBalanceData.result || "0";
    }

    // 3. Get metadata for all tokens
    const tokensWithMetadata = await Promise.all(
      tokenBalances
        .filter((token) => token.tokenBalance !== "0x0")
        .map(async (token) => {
          // Skip tokens with zero balance
          if (token.tokenBalance === "0x0" || token.tokenBalance === "0") {
            return null;
          }

          try {
            const metadataResponse = await fetch(balancesUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "alchemy_getTokenMetadata",
                params: [token.contractAddress],
              }),
            });

            if (!metadataResponse.ok) return null;

            const metadataData = await metadataResponse.json();
            const metadata: TokenMetadata = metadataData.result;

            // Format the balance using the correct decimals
            const decimals = metadata.decimals || 18;
            const formattedBalance = ethers.formatUnits(
              token.tokenBalance,
              decimals
            );

            return {
              contractAddress: token.contractAddress,
              tokenBalance: token.tokenBalance,
              metadata: {
                name: metadata.name || "Unknown Token",
                symbol: metadata.symbol || "???",
                decimals: metadata.decimals || 18,
                logo: metadata.logo,
              },
              formattedBalance,
              isNative: false,
            };
          } catch (error) {
            console.error(
              `Error fetching metadata for ${token.contractAddress}:`,
              error
            );
            return null;
          }
        })
    );

    // Add native token to the list
    const nativeSymbol = getNativeSymbol(chainId);
    const nativeTokenData = {
      contractAddress: null,
      tokenBalance: nativeBalance,
      metadata: {
        name: getNativeName(chainId),
        symbol: nativeSymbol,
        decimals: 18,
        logo: `/icons/${nativeSymbol.toLowerCase()}-logo.svg`,
      },
      formattedBalance: ethers.formatEther(nativeBalance),
      isNative: true,
    };

    // Filter out null entries and add native token
    const finalTokens = [
      nativeTokenData,
      ...tokensWithMetadata.filter(Boolean),
    ];

    // Calculate total value (just a placeholder - would need price data for real values)
    const totalValue = 0; // In a real implementation, we would calculate this with price data

    return NextResponse.json({
      tokens: finalTokens,
      totalValue,
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens from Alchemy" },
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

/**
 * Get the native token name for a given chain ID
 */
function getNativeName(chainId: string): string {
  switch (chainId) {
    case "eth-mainnet":
    case "eth-sepolia":
      return "Ethereum";
    case "polygon-mainnet":
    case "polygon-mumbai":
      return "Polygon";
    case "monad-test-v2":
      return "Monad";
    case "opt-mainnet":
      return "Optimism Ethereum";
    case "arb-mainnet":
      return "Arbitrum Ethereum";
    default:
      return "Ethereum";
  }
}
