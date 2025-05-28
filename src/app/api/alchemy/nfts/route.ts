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
  pageKey?: string;
}

interface ProcessedNFT {
  tokenId: string | undefined;
  name: string;
  description: string;
  image: string | null;
  contractAddress: string;
  collectionName: string;
  contractSymbol: string;
  tokenType: string;
  timeLastUpdated: string;
  metadata: any;
}

/**
 * Fetch NFTs owned by a wallet address using Alchemy API with pagination
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId") || "monad-test-v2";

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  if (!ALCHEMY_API_KEY) {
    return NextResponse.json(
      { error: "Alchemy API key not configured" },
      { status: 500 }
    );
  }

  // Get the correct base URL for the chain
  const baseUrl = getAlchemyBaseUrl(chainId);

  console.log(`Fetching NFTs for address: ${address} on chain: ${chainId}`);

  try {
    const allNFTs: any[] = [];
    let pageKey: string | undefined;
    let pageCount = 0;
    const maxPages = 10; // Safety limit

    do {
      pageCount++;

      const url = new URL(`${baseUrl}/${ALCHEMY_API_KEY}/getNFTs`);
      url.searchParams.append("owner", address);
      url.searchParams.append("withMetadata", "true");
      url.searchParams.append("pageSize", "100");

      if (pageKey) {
        url.searchParams.append("pageKey", pageKey);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Alchemy API error (page ${pageCount}):`,
          response.status,
          errorText
        );
        throw new Error(`Alchemy API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (data.ownedNfts && data.ownedNfts.length > 0) {
        allNFTs.push(...data.ownedNfts);
      }

      pageKey = data.pageKey;
    } while (pageKey && pageCount < maxPages);

    console.log(
      `Finished fetching NFTs. Total pages: ${pageCount}, Total NFTs: ${allNFTs.length}`
    );

    // Format and return the NFT data
    return NextResponse.json({
      nfts: allNFTs.map(formatNFT),
      totalCount: allNFTs.length,
      metadata: {
        totalNFTs: allNFTs.length,
        pagesRetrieved: pageCount,
        hasMorePages: !!pageKey,
      },
    });
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch NFTs from Alchemy",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Format NFT data for frontend consumption
 */
function formatNFT(nft: NFT): ProcessedNFT {
  // Extract tokenId from the correct location in the Alchemy response structure
  let tokenId: string | undefined;

  // Try multiple sources for tokenId
  if (nft.id?.tokenId) {
    const rawTokenId = nft.id.tokenId;

    // Convert from hex to decimal if it's in hex format (0x...)
    if (rawTokenId.startsWith("0x")) {
      tokenId = parseInt(rawTokenId, 16).toString();
    } else {
      tokenId = rawTokenId;
    }
  } else if (nft.tokenId) {
    // Fallback to direct tokenId field
    tokenId = nft.tokenId;
  } else {
    tokenId = undefined;
  }

  const imageUrl = getImageUrl(nft);

  return {
    tokenId: tokenId,
    name: nft.title || nft.metadata?.name || "Unnamed NFT",
    description: nft.description || nft.metadata?.description || "",
    image: imageUrl,
    contractAddress: nft.contract.address,
    collectionName:
      nft.contractMetadata?.name || nft.contract.name || "Unknown Collection",
    contractSymbol: nft.contractMetadata?.symbol || nft.contract.symbol || "",
    tokenType:
      nft.id?.tokenMetadata?.tokenType ||
      nft.contractMetadata?.tokenType ||
      nft.tokenType ||
      nft.contract.tokenType ||
      "ERC721",
    timeLastUpdated: nft.timeLastUpdated,
    metadata: nft.metadata,
  };
}

/**
 * Get the best available image URL for an NFT
 */
function getImageUrl(nft: NFT): string | null {
  // Priority 1: Try media.gateway first - this is Alchemy's CDN URL (already HTTP)
  if (nft.media && nft.media.length > 0 && nft.media[0].gateway) {
    return nft.media[0].gateway;
  }

  // Priority 2: Try metadata image (might be IPFS, but let's try it)
  if (nft.metadata?.image) {
    // If it's already HTTP, use it
    if (
      nft.metadata.image.startsWith("http://") ||
      nft.metadata.image.startsWith("https://")
    ) {
      return nft.metadata.image;
    }
    // If it's IPFS, convert to gateway
    if (nft.metadata.image.startsWith("ipfs://")) {
      const hash = nft.metadata.image.replace("ipfs://", "");
      return `https://cloudflare-ipfs.com/ipfs/${hash}`;
    }
  }

  // Priority 3: Try media.raw as fallback
  if (nft.media && nft.media.length > 0 && nft.media[0].raw) {
    const rawUrl = nft.media[0].raw;
    // If it's already HTTP, use it
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      return rawUrl;
    }
    // If it's IPFS, convert to gateway
    if (rawUrl.startsWith("ipfs://")) {
      const hash = rawUrl.replace("ipfs://", "");
      return `https://cloudflare-ipfs.com/ipfs/${hash}`;
    }
  }

  // Priority 4: OpenSea fallback
  if (nft.contractMetadata?.openSea?.imageUrl) {
    return nft.contractMetadata.openSea.imageUrl;
  }

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
