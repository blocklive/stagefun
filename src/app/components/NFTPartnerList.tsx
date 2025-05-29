"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNFTPartners } from "../../hooks/useNFTPartners";
import { NFTCollection } from "../../hooks/useNFTPartners";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { FaGem } from "react-icons/fa";
import { colors } from "../../lib/theme";

const NFTPartnerList = () => {
  const {
    ownedCollections,
    lockedCollections,
    activeCollection,
    selectCollection,
    dropdownOpen,
    toggleDropdown,
    closeDropdown,
    isLoading,
  } = useNFTPartners();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDropdown]);

  const formatMultiplier = (value: number): string => {
    return `${value.toFixed(2)}x multiplier`;
  };

  // Simple collection icon component
  const CollectionIcon = ({
    collection,
    size = 32,
  }: {
    collection: NFTCollection;
    size?: number;
  }) => {
    const [showFallback, setShowFallback] = useState(!collection.icon);

    if (showFallback) {
      return (
        <div
          className="rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            width: size,
            height: size,
            backgroundColor: `${colors.purple.DEFAULT}20`,
          }}
        >
          <FaGem color={colors.purple.DEFAULT} size={size * 0.6} />
        </div>
      );
    }

    return (
      <img
        src={collection.icon}
        alt={collection.name}
        className="rounded-md flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setShowFallback(true)}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
        <div className="mb-4">
          <h3 className="font-bold text-white text-base mb-1">
            Partner collection multiplier
          </h3>
          <p className="text-sm text-gray-400">
            Stage collaborates with other NFT collections for multiplier
            options. Select yours below
          </p>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#FFFFFF08]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600 rounded-md animate-pulse"></div>
            <div className="text-gray-400">Loading NFTs...</div>
          </div>
          <div className="w-4 h-4 bg-gray-600 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl" ref={dropdownRef}>
      <div className="mb-4">
        <h3 className="font-bold text-white text-base mb-1">
          Partner collection multiplier
        </h3>
        <p className="text-sm text-gray-400">
          Stage collaborates with other NFT collections for multiplier options.
          Select yours below
        </p>
      </div>

      {/* Dropdown Toggle */}
      <div
        className="flex items-center justify-between p-3 rounded-lg bg-[#FFFFFF08] hover:bg-[#FFFFFF10] cursor-pointer transition-colors"
        onClick={toggleDropdown}
      >
        <div className="flex items-center gap-3">
          {activeCollection ? (
            <>
              <CollectionIcon collection={activeCollection} size={32} />
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm">
                  {activeCollection.name}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                className="rounded-md flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: `${colors.purple.DEFAULT}20`,
                }}
              >
                <FaGem color={colors.purple.DEFAULT} size={18} />
              </div>
              <span className="text-gray-400">No NFT selected</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCollection && (
            <span
              style={{ color: colors.purple.DEFAULT }}
              className="text-sm font-medium"
            >
              {formatMultiplier(activeCollection.multiplier)}
            </span>
          )}
          {dropdownOpen ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="mt-2 space-y-1 border border-[#FFFFFF14] rounded-lg bg-[#FFFFFF08] overflow-hidden">
          {/* Owned Collections */}
          {ownedCollections.map((collection) => (
            <div
              key={collection.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-[#FFFFFF10] transition-colors ${
                activeCollection?.id === collection.id ? "bg-[#FFFFFF14]" : ""
              }`}
              onClick={() => selectCollection(collection.id)}
            >
              <div className="flex items-center gap-3">
                <CollectionIcon collection={collection} size={32} />
                <div className="flex flex-col">
                  <span className="text-white font-medium text-sm">
                    {collection.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  style={{ color: colors.purple.DEFAULT }}
                  className="text-sm font-medium"
                >
                  {formatMultiplier(collection.multiplier)}
                </span>
              </div>
            </div>
          ))}

          {/* Locked Collections */}
          {lockedCollections.map((collection) => (
            <div
              key={collection.id}
              className="flex items-center justify-between p-3 rounded-lg cursor-not-allowed opacity-60"
            >
              <div className="flex items-center gap-3">
                <CollectionIcon collection={collection} size={32} />
                <div className="flex flex-col">
                  <span className="text-white font-medium text-sm">
                    {collection.name}
                  </span>
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    🔒
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  style={{ color: colors.purple.DEFAULT }}
                  className="text-sm font-medium"
                >
                  {formatMultiplier(collection.multiplier)}
                </span>

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
              </div>
            </div>
          ))}

          {/* Empty state */}
          {ownedCollections.length === 0 && lockedCollections.length === 0 && (
            <div className="p-3 text-center text-gray-400 text-sm">
              No partner collections available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NFTPartnerList;
