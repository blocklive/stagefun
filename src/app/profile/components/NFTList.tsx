"use client";

import React, { useState } from "react";
import Image from "next/image";
import { NFT } from "../../../hooks/useWalletNFTs";
import { FaExternalLinkAlt } from "react-icons/fa";

interface NFTListProps {
  nfts: NFT[];
  isLoading: boolean;
  error: any;
  emptyMessage?: string;
  isOwnProfile?: boolean;
}

// Helper function to get Magic Eden URL for an NFT
const getMagicEdenUrl = (nft: NFT) => {
  const tokenId = nft.tokenId;
  const contractAddress = nft.contractAddress;

  // Direct link to Monad testnet NFT on Magic Eden
  if (contractAddress && tokenId) {
    return `https://magiceden.us/item-details/monad-testnet/${contractAddress}/${tokenId}`;
  }

  // Fallback to Monad testnet marketplace if we don't have complete NFT info
  return "https://magiceden.us/collections/monad-testnet";
};

// Helper to get the tier name from NFT metadata or name
const getTierName = (nft: NFT) => {
  // First try to find tier in metadata
  if (nft.metadata) {
    if (nft.metadata.tier) return nft.metadata.tier;

    // Check in attributes
    if (nft.metadata.attributes) {
      const tierAttribute = nft.metadata.attributes.find(
        (attr: any) =>
          attr.trait_type?.toLowerCase() === "tier" ||
          attr.trait_type?.toLowerCase() === "level" ||
          attr.trait_type?.toLowerCase() === "rank"
      );
      if (tierAttribute) return tierAttribute.value;
    }
  }

  // If not in metadata, try to extract from name if it contains "Tier" or similar
  const nameParts = nft.name.split(/\s+/);
  for (let i = 0; i < nameParts.length - 1; i++) {
    if (
      nameParts[i].toLowerCase() === "tier" ||
      nameParts[i].toLowerCase() === "level" ||
      nameParts[i].toLowerCase() === "pass"
    ) {
      return `${nameParts[i]} ${nameParts[i + 1]}`;
    }
  }

  // Fallback: if name has "Patron" in it, just return "Patron Pass"
  if (nft.name.toLowerCase().includes("patron")) {
    return "Patron Pass";
  }

  // Default
  return "Pass";
};

// Simple dark placeholder - just a dark gray square with text
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23202020'/%3E%3Cpath d='M35 30H65C67.7614 30 70 32.2386 70 35V65C70 67.7614 67.7614 70 65 70H35C32.2386 70 30 67.7614 30 65V35C30 32.2386 32.2386 30 35 30ZM35 33C33.8954 33 33 33.8954 33 35V56.25L41.25 48L46.25 53L58.75 40.5L67 48.75V35C67 33.8954 66.1046 33 65 33H35ZM45 45C45 47.7614 42.7614 50 40 50C37.2386 50 35 47.7614 35 45C35 42.2386 37.2386 40 40 40C42.7614 40 45 42.2386 45 45Z' fill='%236E5DD7' fill-rule='evenodd'/%3E%3C/svg%3E";

// NFT Card Component
const NFTCard: React.FC<{ nft: NFT }> = ({ nft }) => {
  const [imageError, setImageError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get Magic Eden link for this NFT
  const magicEdenUrl = getMagicEdenUrl(nft);

  // Get tier name
  const tierName = getTierName(nft);

  // Check if NFT might have viewing issues
  const mightHaveViewingIssues = !nft.tokenId;

  // Alternative implementation without Image component for better compatibility
  return (
    <div className="bg-[#1E1F23] rounded-xl overflow-hidden flex flex-row items-center mb-3">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 m-3">
        <div className="w-full h-full">
          <Image
            src={!imageError && nft.image ? nft.image : PLACEHOLDER_IMAGE}
            alt={nft.name || "NFT"}
            width={64}
            height={64}
            className="object-cover h-full w-full"
            onError={() => setImageError(true)}
            unoptimized={true}
          />
        </div>
      </div>
      <div className="p-4 flex-1">
        <p className="text-gray-400 text-sm">{nft.collectionName}</p>
        <h3 className="text-white font-medium truncate">{tierName}</h3>
      </div>
      <div className="relative mr-4">
        <a
          href={magicEdenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-[#3A3650] rounded-full transition-colors inline-flex"
          aria-label="View on Magic Eden"
          onMouseEnter={() => mightHaveViewingIssues && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <FaExternalLinkAlt className="text-gray-400 hover:text-white w-4 h-4" />
        </a>

        {showTooltip && mightHaveViewingIssues && (
          <div className="absolute right-0 bottom-full mb-2 bg-[#121212] text-white text-xs p-2 rounded shadow-lg w-48 z-10">
            This NFT may not display correctly on Magic Eden due to missing
            token data
          </div>
        )}
      </div>
    </div>
  );
};

export default function NFTList({
  nfts,
  isLoading,
  error,
  emptyMessage = "No NFTs found in this wallet.",
  isOwnProfile = true,
}: NFTListProps) {
  // Filter for our specific StageDotFunNFT tokens
  const stageNFTs = nfts.filter(
    (nft) =>
      nft.collectionName.includes("Patron") ||
      nft.collectionName.includes("Stage") ||
      nft.contractAddress.toLowerCase() ===
        process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS?.toLowerCase()
  );

  // Other NFTs
  const otherNFTs = nfts.filter((nft) => !stageNFTs.includes(nft));

  // Sort all NFTs alphabetically by name
  const sortedNFTs = [...nfts].sort((a, b) => {
    // Sort alphabetically by name
    return a.name.localeCompare(b.name);
  });

  if (error) {
    const errorMessage = error?.message?.includes("is not enabled")
      ? "This network is not currently supported."
      : "Failed to load NFTs";

    return (
      <div className="text-center py-4">
        <div className="text-red-400 mb-2">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#836EF9]"></div>
        </div>
      ) : sortedNFTs.length > 0 ? (
        <div className="space-y-2">
          {sortedNFTs.map((nft, index) => (
            <NFTCard
              key={
                nft.tokenId
                  ? `${nft.contractAddress}-${nft.tokenId}`
                  : `${nft.contractAddress}-${index}`
              }
              nft={nft}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">{emptyMessage}</div>
      )}
    </div>
  );
}
