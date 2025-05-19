import { NextRequest, NextResponse } from "next/server";

// Alchemy API configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const chainId = searchParams.get("chainId") || "monad-test-v2";
    const requestPageKey = searchParams.get("pageKey") || null;
    const limit = searchParams.get("limit") || "25";

    console.log("DEBUG: Transaction history API request params:", {
      address,
      chainId,
      pageKey: requestPageKey,
      limit,
    });

    if (!address) {
      console.error("ERROR: No address provided in request");
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    if (!ALCHEMY_API_KEY) {
      console.error("ERROR: No Alchemy API key configured");
      return NextResponse.json(
        { error: "Alchemy API key not configured" },
        { status: 500 }
      );
    }

    // Convert chainId to network format expected by Portfolio API
    const network = convertChainIdToNetworkName(chainId);

    // Handle Monad testnet specially since it may not be supported by Portfolio API
    if (chainId === "monad-test-v2") {
      console.log(
        "DEBUG: Monad testnet is not supported by the Portfolio API yet"
      );

      return NextResponse.json({
        transfers: [],
        metadata: {
          hasMore: false,
          pageKey: null,
          message:
            "Monad testnet is not yet supported by Alchemy Portfolio API",
        },
      });
    }

    // Construct the Alchemy Portfolio API URL
    const baseUrl = "https://api.g.alchemy.com/data/v1";
    const url = `${baseUrl}/${ALCHEMY_API_KEY}/transactions/history/by-address`;

    console.log(
      `DEBUG: Using Alchemy Portfolio API URL: ${baseUrl}/**** (API key hidden)`
    );

    // Create the request body for the Portfolio API
    const requestBody: {
      addresses: Array<{
        address: string;
        networks: string[];
      }>;
      limit: number;
      after?: string;
    } = {
      addresses: [
        {
          address: address,
          networks: [network],
        },
      ],
      limit: parseInt(limit),
    };

    // Add pagination parameters if needed
    if (requestPageKey) {
      requestBody.after = requestPageKey;
    }

    console.log("DEBUG: Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    console.log(`DEBUG: API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Alchemy API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to fetch transaction data: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(
      "DEBUG: Response headers:",
      JSON.stringify(response.headers, null, 2)
    );

    // Transform the portfolio API response to match our existing format
    // so we don't have to change the frontend components
    const transformedResponse = transformPortfolioResponse(data, address);

    console.log(
      `DEBUG: Returning ${transformedResponse.transfers.length} transactions`
    );
    return NextResponse.json(transformedResponse);
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction history from Alchemy" },
      { status: 500 }
    );
  }
}

/**
 * Convert our chainId format to the network name used by Alchemy Portfolio API
 */
function convertChainIdToNetworkName(chainId: string): string {
  switch (chainId) {
    case "eth-mainnet":
      return "eth-mainnet";
    case "eth-sepolia":
      return "eth-sepolia";
    case "polygon-mainnet":
      return "polygon-mainnet";
    case "polygon-mumbai":
      return "polygon-mumbai";
    case "opt-mainnet":
      return "opt-mainnet";
    case "arb-mainnet":
      return "arb-mainnet";
    case "base-mainnet":
      return "base-mainnet";
    default:
      console.log(
        `Chain ID ${chainId} not explicitly mapped, using eth-mainnet as default`
      );
      return "eth-mainnet";
  }
}

/**
 * Transform the Portfolio API response to match our existing format
 * This way we don't need to change our frontend components
 */
function transformPortfolioResponse(data: any, walletAddress: string) {
  const transactions = data.transactions || [];

  // Map Portfolio API transactions to our expected format
  const transfers = transactions.map((tx: any) => {
    const isSent =
      tx.fromAddress?.toLowerCase() === walletAddress.toLowerCase();

    // Create a simplified transfer object that matches our existing UI expectations
    return {
      blockNum: tx.blockNumber ? `0x${tx.blockNumber.toString(16)}` : "",
      hash: tx.hash,
      from: tx.fromAddress,
      to: tx.toAddress,
      value: tx.value ? parseFloat(tx.value) : 0,
      asset: "ETH", // Default to ETH, could be enhanced with token detection
      category: isSent ? "sent" : "received",
      rawContract: {
        value: tx.value || "0",
        decimal: "0x12", // Standard ETH decimal
        address: tx.contractAddress || null,
      },
      tokenId: null,
      erc721TokenId: null,
      erc1155Metadata: null,
      metadata: {
        blockTimestamp: new Date(tx.blockTimestamp).toISOString(),
        network: tx.network,
      },
    };
  });

  return {
    transfers,
    metadata: {
      hasMore: Boolean(data.after),
      pageKey: data.after,
      before: data.before,
    },
  };
}
