import { NextRequest, NextResponse } from "next/server";

// Alchemy API configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ALCHEMY_BASE_URL = "https://eth-mainnet.g.alchemy.com/v2";

// Define NFT data types
interface NFT {
  contract: {
    address: string;
    name: string;
    symbol: string;
    totalSupply: string;
    tokenType: string;
  };
  tokenId?: string; // May not be present in Alchemy response
  id?: {
    tokenId: string;
    tokenMetadata?: {
      tokenType: string;
    };
  };
  tokenType: string;
  title: string;
  description: string;
  tokenUri: {
    raw: string;
    gateway: string;
  };
  media: Array<{
    raw: string;
    gateway: string;
    thumbnail?: string;
    format?: string;
    bytes?: number;
  }>;
  metadata: {
    name?: string;
    description?: string;
    image?: string;
    [key: string]: any;
  };
  timeLastUpdated: string;
  contractMetadata?: {
    name?: string;
    symbol?: string;
    tokenType?: string;
    openSea?: {
      floorPrice?: number;
      collectionName?: string;
      imageUrl?: string;
      description?: string;
    };
  };
}

interface AlchemyNFTResponse {
  ownedNfts: NFT[];
  totalCount: number;
  blockHash: string;
}

/**
 * Fetch NFTs owned by a wallet address using Alchemy API
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const chainId = searchParams.get("chainId") || "eth-mainnet";

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

    // Build the API URL to fetch NFTs
    const apiUrl = `${baseUrl}/${ALCHEMY_API_KEY}/getNFTs/?owner=${address}`;

    // Fetch NFTs from Alchemy API
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Alchemy API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to fetch NFTs: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data: AlchemyNFTResponse = await response.json();

    // Format and return the NFT data
    return NextResponse.json({
      nfts: data.ownedNfts.map(formatNFT),
      totalCount: data.totalCount,
    });
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return NextResponse.json(
      { error: "Failed to fetch NFTs from Alchemy" },
      { status: 500 }
    );
  }
}

/**
 * Format NFT data for frontend consumption
 */
function formatNFT(nft: NFT) {
  // Extract tokenId from the correct location in the Alchemy response structure
  const tokenId = nft.id?.tokenId
    ? // Convert from hex to decimal if it's in hex format (0x...)
      nft.id.tokenId.startsWith("0x")
      ? parseInt(nft.id.tokenId, 16).toString()
      : nft.id.tokenId
    : undefined;

  return {
    tokenId: tokenId,
    name: nft.title || nft.metadata?.name || "Unnamed NFT",
    description: nft.description || nft.metadata?.description || "",
    image: getImageUrl(nft),
    contractAddress: nft.contract.address,
    collectionName:
      nft.contractMetadata?.name || nft.contract.name || "Unknown Collection",
    contractSymbol: nft.contractMetadata?.symbol || nft.contract.symbol || "",
    tokenType: nft.tokenType || nft.contract.tokenType || "ERC721",
    timeLastUpdated: nft.timeLastUpdated,
    metadata: nft.metadata,
  };
}

/**
 * Get the best available image URL for an NFT
 */
function getImageUrl(nft: NFT): string | null {
  // Try to get image from metadata first
  if (nft.metadata?.image) {
    return nft.metadata.image;
  }

  // Try media.gateway which is usually the best representation
  if (nft.media && nft.media.length > 0) {
    if (nft.media[0].gateway) {
      return nft.media[0].gateway;
    }
    if (nft.media[0].raw) {
      return nft.media[0].raw;
    }
  }

  // If we have a contract with OpenSea data, use that as a fallback
  if (nft.contractMetadata?.openSea?.imageUrl) {
    return nft.contractMetadata.openSea.imageUrl;
  }

  // Return null when no image is available
  return null;
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
