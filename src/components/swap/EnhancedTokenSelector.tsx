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
  const [activeTab, setActiveTab] = useState<
    "all" | "platform" | "recent" | "custom"
  >("all");
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
    activeTab === "all"
      ? filteredTokens.all
      : activeTab === "platform"
      ? filteredTokens.platform
      : activeTab === "recent"
      ? filteredTokens.recent
      : filteredTokens.custom
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-[#1e1e2a] rounded-xl shadow-lg w-full max-h-[90vh] flex flex-col"
          style={{
            position: "absolute",
            maxWidth: "450px",
            ...(modalPosition
              ? {
                  left: `${modalPosition.left}px`,
                  top: `${modalPosition.top}px`,
                  width: `${modalPosition.width}px`,
                }
              : {}),
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the modal itself
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
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
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or paste address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#836ef9]"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              className={`px-4 py-3 text-sm font-medium flex-1 ${
                activeTab === "all"
                  ? "text-white border-b-2 border-[#836ef9]"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex-1 ${
                activeTab === "platform"
                  ? "text-white border-b-2 border-[#836ef9]"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("platform")}
            >
              Platform
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex-1 ${
                activeTab === "recent"
                  ? "text-white border-b-2 border-[#836ef9]"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("recent")}
            >
              Recent
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex-1 ${
                activeTab === "custom"
                  ? "text-white border-b-2 border-[#836ef9]"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("custom")}
            >
              Custom
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
                    ? "No tokens found. Try a different search term or add a custom token."
                    : `No ${activeTab} tokens found.`
                }
              />
            )}
          </div>

          {/* Footer with custom token button */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={() => setIsAddTokenModalOpen(true)}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>Add Custom Token</span>
            </button>
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
