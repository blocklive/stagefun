import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
// Alchemy SDK is not directly used for the Portfolio API fetch, but kept for potential other uses or consistency.
// import { Alchemy, Network } from "alchemy-sdk";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Alchemy API configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Official token addresses
const OFFICIAL_WMON_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.officialWmon.toLowerCase();
const OFFICIAL_USDC_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase();

// Interface for processed token structure, can be enhanced if needed
interface ProcessedToken {
  contractAddress: string | null; // Native token might have null
  tokenBalance: string;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
    logo?: string;
  };
  formattedBalance: string;
  isNative: boolean;
  isOfficialWmon: boolean;
  isOfficialUsdc: boolean;
  // Add other fields if needed, e.g., priceInfo
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

    const alchemyNetwork = mapChainIdToAlchemyNetwork(chainId);
    if (!alchemyNetwork) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    console.log(
      `Fetching tokens for ${address} on ${alchemyNetwork} via Portfolio API`
    );

    const url = `https://api.g.alchemy.com/data/v1/${ALCHEMY_API_KEY}/assets/tokens/by-address`;
    let allProcessedTokens: ProcessedToken[] = [];
    let currentPageKey: string | undefined = undefined;
    let pagesRetrieved = 0;

    do {
      pagesRetrieved++;
      const payload: any = {
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

      if (currentPageKey) {
        payload.pageKey = currentPageKey;
      }

      console.log(
        `Fetching tokens page ${pagesRetrieved} with request:`,
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
          `Portfolio API error on page ${pagesRetrieved}: ${portfolioResponse.status} - ${errorText}`
        );
        if (portfolioResponse.status >= 400) {
          console.error(
            `Full request details for failing page ${pagesRetrieved}:\\nURL: ${url}\\nRequest Body: ${JSON.stringify(
              payload
            )}`
          );
        }
        return NextResponse.json(
          {
            error: `Failed to fetch tokens: ${portfolioResponse.statusText}`,
            details: errorText,
          },
          { status: portfolioResponse.status }
        );
      }

      const portfolioData = await portfolioResponse.json();
      // console.log(
      //   `Portfolio API response for page ${pagesRetrieved}:`,
      //   JSON.stringify(portfolioData, null, 2)
      // );

      // REVERTING to previous way of accessing tokenData, as per user feedback
      const tokenData = portfolioData?.data?.tokens || [];
      console.log(
        `Retrieved ${tokenData.length} token objects from Portfolio API on page ${pagesRetrieved}`
      );

      const processedTokensThisPage: ProcessedToken[] = tokenData
        .filter((token: any) => {
          const balance = token.tokenBalance || "0x0";
          const isNonZero =
            balance !== "0x0" &&
            balance !== "0" &&
            balance !== "0x00" &&
            balance !==
              "0x0000000000000000000000000000000000000000000000000000000000000000";
          return isNonZero;
        })
        .map((token: any): ProcessedToken => {
          const contractAddress = token.tokenAddress;
          const rawBalance = token.tokenBalance || "0";
          // Assuming tokenMetadata is directly available and structured as needed
          const tokenMetadata = token.tokenMetadata || {};

          const isNative = !contractAddress;

          let decimals = tokenMetadata.decimals;
          if (decimals === undefined || decimals === null) {
            decimals = isNative ? 18 : 6;
          }

          let formattedBalance;
          try {
            formattedBalance = ethers.formatUnits(rawBalance, decimals);
          } catch (error) {
            console.error(
              `Error formatting balance for ${
                contractAddress || "Native Token"
              }:`,
              rawBalance,
              `with decimals ${decimals}`,
              error
            );
            formattedBalance = "0.0";
          }

          const contractAddressLower = contractAddress?.toLowerCase();
          const isOfficialWmon = contractAddressLower === OFFICIAL_WMON_ADDRESS;
          const isOfficialUsdc = contractAddressLower === OFFICIAL_USDC_ADDRESS;

          let logoUrl = tokenMetadata.logo;
          if (isNative) {
            logoUrl = `/icons/mon-logo.svg`;
          } else if (isOfficialWmon) {
            logoUrl = `/icons/mon-logo.svg`;
          } else if (isOfficialUsdc) {
            logoUrl = `/icons/usdc-logo.svg`;
          }

          return {
            contractAddress: contractAddress || null,
            tokenBalance: rawBalance,
            metadata: {
              name:
                tokenMetadata.name ||
                (isNative ? getNativeName(chainId) : "Unknown Token"),
              symbol:
                tokenMetadata.symbol ||
                (isNative ? getNativeSymbol(chainId) : "???"),
              decimals: decimals,
              logo: logoUrl,
            },
            formattedBalance,
            isNative,
            isOfficialWmon,
            isOfficialUsdc,
          };
        });

      allProcessedTokens = allProcessedTokens.concat(processedTokensThisPage);

      // REVERTING to previous way of accessing currentPageKey, as per user feedback
      currentPageKey = portfolioData?.data?.pageKey;

      if (currentPageKey) {
        console.log(`Next pageKey found: ${currentPageKey}`);
      } else {
        console.log(`No more pageKey found. Fetched all pages.`);
      }
    } while (currentPageKey);

    console.log(
      `Total after filtering and processing all pages: ${allProcessedTokens.length} tokens across ${pagesRetrieved} pages.`
    );

    return NextResponse.json({
      tokens: allProcessedTokens,
      metadata: {
        totalTokens: allProcessedTokens.length,
        pagesRetrieved: pagesRetrieved,
        hasMorePages: false,
      },
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tokens from Alchemy Portfolio API",
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
    "monad-test-v2": "MONAD_TESTNET", // Ensure this matches Alchemy's expected value if it's custom
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
      return "MON"; // Assuming MON for your custom testnet
    case "opt-mainnet":
      return "ETH"; // Optimism uses ETH
    case "arb-mainnet":
      return "ETH"; // Arbitrum uses ETH
    default:
      return "ETH"; // Default or throw error
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
      return "Monad"; // Assuming Monad for your custom testnet
    case "opt-mainnet":
      return "Optimism";
    case "arb-mainnet":
      return "Arbitrum";
    default:
      return "Ethereum"; // Default or throw error
  }
}
