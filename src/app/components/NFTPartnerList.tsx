"use client";

import React from "react";
import { useNFTPartners } from "../../hooks/useNFTPartners";
import { NFTCollection } from "../../hooks/useNFTPartners";

const NFTPartnerList = () => {
  const {
    ownedCollections,
    lockedCollections,
    selectedCollection,
    selectCollection,
  } = useNFTPartners();

  const formatMultiplier = (value: number): string => {
    return `${value.toFixed(2)}x multiplier`;
  };

  const NFTCollectionItem = ({
    collection,
    isSelected = false,
  }: {
    collection: NFTCollection;
    isSelected?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
        isSelected
          ? "bg-[#FFFFFF14] border border-[#FFDD50]"
          : "bg-[#FFFFFF08] hover:bg-[#FFFFFF10]"
      }`}
      onClick={() => !collection.locked && selectCollection(collection.id)}
    >
      <div className="flex items-center gap-3">
        {/* NFT Icon placeholder */}
        <div className="w-8 h-8 bg-purple-600 rounded-md flex items-center justify-center">
          <div className="w-6 h-6 bg-purple-400 rounded"></div>
        </div>

        <div className="flex flex-col">
          <span className="text-white font-medium text-sm">
            {collection.name}
          </span>
          {collection.locked && (
            <span className="text-gray-500 text-xs flex items-center gap-1">
              🔒
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[#FFDD50] text-sm font-medium">
          {formatMultiplier(collection.multiplier)}
        </span>

        {collection.locked ? (
          <button
            className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (collection.buyUrl) {
                window.open(collection.buyUrl, "_blank");
              }
            }}
          >
            Buy
          </button>
        ) : isSelected ? (
          <div className="w-4 h-4 bg-[#FFDD50] rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-black rounded-full"></div>
          </div>
        ) : (
          <div className="w-4 h-4 border border-gray-500 rounded-full"></div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      <div className="mb-4">
        <h3 className="font-bold text-white text-base mb-1">
          Partner collection multiplier
        </h3>
        <p className="text-sm text-gray-400">
          Stage collaborates with other NFT collections for multiplier options.
          Select yours below
        </p>
      </div>

      <div className="space-y-2">
        {/* Owned Collections */}
        {ownedCollections.map((collection) => (
          <NFTCollectionItem
            key={collection.id}
            collection={collection}
            isSelected={selectedCollection === collection.id}
          />
        ))}

        {/* Locked Collections */}
        {lockedCollections.map((collection) => (
          <NFTCollectionItem key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  );
};

export default NFTPartnerList;
