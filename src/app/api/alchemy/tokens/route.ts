import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { Alchemy, Network } from "alchemy-sdk";

// Alchemy API configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

/**
 * Fetch token balances for a wallet address using Alchemy Portfolio API
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

    // Map our chain ID format to Alchemy's network format
    const alchemyNetwork = mapChainIdToAlchemyNetwork(chainId);
    if (!alchemyNetwork) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    console.log(`Fetching tokens for ${address} on ${alchemyNetwork}`);

    // Use the Portfolio API with the correct request format
    const url = `https://api.g.alchemy.com/data/v1/${ALCHEMY_API_KEY}/assets/tokens/by-address`;

    // Structure the request with address objects and networks array
    const payload = {
      addresses: [
        {
          address: address,
          networks: [alchemyNetwork],
        },
      ],
      withMetadata: true,
      withPrices: true,
      includeNativeTokens: true,
    };

    console.log(
      "Fetching tokens using Portfolio API with request:",
      JSON.stringify(payload)
    );

    const portfolioResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!portfolioResponse.ok) {
      const errorText = await portfolioResponse.text();
      console.error(
        `Portfolio API error: ${portfolioResponse.status} - ${errorText}`
      );
      console.error(`Full request details:
        URL: ${url}
        Request Body: ${JSON.stringify(payload)}
      `);

      return NextResponse.json(
        {
          error: `Failed to fetch tokens: ${portfolioResponse.statusText}`,
          details: errorText,
        },
        { status: portfolioResponse.status }
      );
    }

    const portfolioData = await portfolioResponse.json();
    console.log(
      "Portfolio API response:",
      JSON.stringify(portfolioData).substring(0, 500) + "..."
    );

    const tokenData = portfolioData?.data?.tokens || [];
    console.log(`Retrieved ${tokenData.length} tokens from Portfolio API`);

    // Process the tokens and filter out zero balances in one pass
    const processedTokens = tokenData
      .filter((token: any) => {
        // For native token or tokens without balance, use 0
        const balance = token.tokenBalance || "0x0";
        // Check if it's not zero (can be hex or decimal string)
        const isNonZero =
          balance !== "0x0" &&
          balance !== "0" &&
          balance !== "0x00" &&
          balance !==
            "0x0000000000000000000000000000000000000000000000000000000000000000";

        if (!isNonZero) {
          console.log(
            `Filtering out zero-balance token: ${
              token.tokenAddress || "native"
            }`
          );
        }

        return isNonZero;
      })
      .map((token: any) => {
        const contractAddress = token.tokenAddress;
        const metadata = token.tokenMetadata || {};
        const balance = token.tokenBalance || "0";
        const isNative = !contractAddress;

        let decimals = metadata.decimals;
        if (decimals === undefined || decimals === null) {
          decimals = isNative ? 18 : 0;
        }

        // Format the balance
        let formattedBalance;
        try {
          formattedBalance = ethers.formatUnits(balance, decimals);
        } catch (error) {
          console.error(
            `Error formatting balance for ${contractAddress}:`,
            error
          );
          formattedBalance = "0";
        }

        // Check if this is the official WMON token
        const isOfficialWmon =
          contractAddress?.toLowerCase() ===
          "0x760afe86e5de5fa0ee542fc7b7b713e1c5425701";

        return {
          contractAddress,
          tokenBalance: balance,
          metadata: {
            name:
              metadata.name ||
              (isNative ? getNativeName(chainId) : "Unknown Token"),
            symbol:
              metadata.symbol || (isNative ? getNativeSymbol(chainId) : "???"),
            decimals: decimals,
            logo:
              metadata.logo ||
              (isNative
                ? `/icons/${getNativeSymbol(chainId).toLowerCase()}-logo.svg`
                : undefined),
          },
          formattedBalance,
          isNative,
          isOfficialWmon,
        };
      });

    console.log(
      `After filtering and processing: ${processedTokens.length} tokens`
    );

    return NextResponse.json({
      tokens: processedTokens,
      totalValue: 0, // We can calculate this if needed from token.tokenPrices
      metadata: {
        totalTokens: processedTokens.length,
        pagesRetrieved: 1,
        hasMorePages: false,
      },
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tokens from Alchemy",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Map our chain ID format to Alchemy's network format
 */
function mapChainIdToAlchemyNetwork(chainId: string): string | null {
  const chainMapping: Record<string, string> = {
    "eth-mainnet": "ETH_MAINNET",
    "eth-sepolia": "ETH_SEPOLIA",
    "polygon-mainnet": "POLYGON_MAINNET",
    "polygon-mumbai": "POLYGON_MUMBAI",
    "opt-mainnet": "OPT_MAINNET",
    "arb-mainnet": "ARB_MAINNET",
    "monad-test-v2": "MONAD_TESTNET",
  };

  return chainMapping[chainId] || null;
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
