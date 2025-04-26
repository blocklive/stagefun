"use client";

import React, { useState } from "react";
import Image from "next/image";
import { NFT } from "../../../hooks/useWalletNFTs";

interface NFTListProps {
  nfts: NFT[];
  isLoading: boolean;
  error: any;
  emptyMessage?: string;
  isOwnProfile?: boolean;
}

// NFT Card Component
const NFTCard: React.FC<{ nft: NFT }> = ({ nft }) => {
  const [imageError, setImageError] = useState(false);

  // Base64 encoded simple placeholder image (gray square with text)
  const placeholderImage =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjAyMDIwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iI2ZmZmZmZiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+";

  return (
    <div className="bg-[#1E1F23] rounded-xl overflow-hidden flex flex-row items-center mb-3">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 m-3">
        <Image
          src={!imageError ? nft.image : placeholderImage}
          alt={nft.name}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
      <div className="p-4 flex-1">
        <p className="text-gray-400 text-sm">{nft.collectionName}</p>
        <h3 className="text-white font-medium truncate">{nft.name}</h3>
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

  // Display all NFTs, with Stage NFTs first
  const sortedNFTs = [...stageNFTs, ...otherNFTs];

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
