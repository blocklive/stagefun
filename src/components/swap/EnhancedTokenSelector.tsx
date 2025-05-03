import React, { useState, useEffect, useCallback } from "react";
import { PlusCircleIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { Token } from "@/types/token";
import { useTokenList } from "@/hooks/useTokenList";
import { VirtualizedTokenList } from "./VirtualizedTokenList";
import { AddCustomToken } from "./AddCustomToken";

interface EnhancedTokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: Token) => void;
  excludeAddresses?: string[];
  title?: string;
  onlyMainTokens?: boolean;
  modalPosition?: {
    left: number;
    top: number;
    width: number;
  };
}

export function EnhancedTokenSelector({
  isOpen,
  onClose,
  onSelectToken,
  excludeAddresses = [],
  title = "Select Token",
  onlyMainTokens = false,
  modalPosition,
}: EnhancedTokenSelectorProps) {
  const [activeTab, setActiveTab] = useState<"all" | "stages">("all");
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);

  const {
    filteredTokens,
    searchTerm,
    setSearchTerm,
    isLoading,
    markTokenAsRecent,
  } = useTokenList({ onlyMainTokens });

  // Filter out excluded tokens
  const getFilteredTokens = useCallback(
    (tokens: Token[]) => {
      return tokens.filter(
        (token) => !excludeAddresses.includes(token.address.toLowerCase())
      );
    },
    [excludeAddresses]
  );

  // Handle token selection
  const handleSelectToken = useCallback(
    (token: Token) => {
      markTokenAsRecent(token);
      onSelectToken(token);
      onClose();
    },
    [markTokenAsRecent, onSelectToken, onClose]
  );

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen, setSearchTerm]);

  if (!isOpen) return null;

  const currentTokens = getFilteredTokens(
    activeTab === "all" ? filteredTokens.all : filteredTokens.platform // Use platform tokens for "stages" tab
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-[#1e1e2a] rounded-xl shadow-lg w-full max-h-[90vh] flex flex-col border-0"
          style={{
            position: "absolute",
            maxWidth: "360px",
            width: "360px",
            ...(modalPosition
              ? {
                  left: `${modalPosition.left}px`,
                  top: `${modalPosition.top}px`,
                }
              : {}),
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the modal itself
        >
          {/* Header */}
          <div className="p-4 border-b-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or paste address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-[#1e1e2a] border-0 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#836ef9] placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex">
            <button
              className={`px-4 py-3 text-sm font-medium flex-1 ${
                activeTab === "all"
                  ? "text-white border-b-2 border-[#836ef9]"
                  : "text-gray-400 hover:text-white border-b-0"
              }`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex-1 ${
                activeTab === "stages"
                  ? "text-white border-b-2 border-[#836ef9]"
                  : "text-gray-400 hover:text-white border-b-0"
              }`}
              onClick={() => setActiveTab("stages")}
            >
              Stages
            </button>
          </div>

          {/* Token list */}
          <div className="overflow-auto flex-grow">
            {isLoading ? (
              <div className="flex items-center justify-center h-60 text-gray-400">
                Loading tokens...
              </div>
            ) : (
              <VirtualizedTokenList
                tokens={currentTokens}
                onSelectToken={handleSelectToken}
                height={350}
                emptyMessage={
                  searchTerm
                    ? "No tokens found. Try a different search term."
                    : `No ${
                        activeTab === "stages" ? "stage" : "matching"
                      } tokens found.`
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Add custom token modal */}
      <AddCustomToken
        isOpen={isAddTokenModalOpen}
        onClose={() => setIsAddTokenModalOpen(false)}
        onTokenAdded={handleSelectToken}
      />
    </>
  );
}
