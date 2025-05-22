import React, { useState, useEffect, useCallback } from "react";
import {
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import { ethers } from "ethers";
import { Token } from "@/types/token";
import { useTokenList } from "@/hooks/useTokenList";
import { useTokenFetcher } from "@/hooks/useTokenFetcher";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import { VirtualizedTokenList } from "./VirtualizedTokenList";
import { AddCustomToken } from "./AddCustomToken";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import showToast from "@/utils/toast";
import { useERC20TokenValidation } from "@/hooks/useERC20TokenValidation";

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
  // Check if alpha mode is enabled

  const [activeTab, setActiveTab] = useState<"all" | "stages">("all");
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);
  const [potentialTokenAddress, setPotentialTokenAddress] = useState<
    string | null
  >(null);

  const {
    filteredTokens,
    coreTokens,
    searchTerm,
    setSearchTerm,
    isLoading,
    markTokenAsRecent,
  } = useTokenList({ onlyMainTokens });

  const { addCustomToken } = useTokenStorage();

  // Use our new hook for ERC20 validation
  const {
    tokenData: detectedToken,
    isValidating: isDetecting,
    isValid,
    error: tokenValidationError,
  } = useERC20TokenValidation(potentialTokenAddress);

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

  // Handle search term changes - check if it might be a token address
  useEffect(() => {
    const checkForTokenAddress = async () => {
      // Reset potential token address when search changes
      setPotentialTokenAddress(null);

      // If search term is empty or too short, do nothing
      if (!searchTerm || searchTerm.length < 10) {
        return;
      }

      // Be more generous with address detection - should be at least 40 chars of hex
      const cleanedInput = searchTerm.startsWith("0x")
        ? searchTerm.substring(2)
        : searchTerm;

      // Check if it looks like a hex string of the right length
      if (/^[0-9a-fA-F]{40,}$/.test(cleanedInput)) {
        try {
          // Ensure the address has 0x prefix
          const normalizedAddress = searchTerm.startsWith("0x")
            ? searchTerm
            : `0x${searchTerm}`;

          console.log("Potential token address detected:", normalizedAddress);

          // Don't validate with ethers here, we'll let the hook handle that
          const checksumAddress = normalizedAddress;

          // Check if this token is already in our list
          const allTokens = [...filteredTokens.all, ...filteredTokens.platform];
          const tokenExists = allTokens.some(
            (token) =>
              token.address.toLowerCase() === checksumAddress.toLowerCase()
          );

          // Always set the potential token address to trigger validation
          // We need this to happen even for existing tokens
          setPotentialTokenAddress(checksumAddress);

          if (tokenExists) {
            console.log("Token already exists in list:", checksumAddress);
          } else {
            console.log("New token address to validate:", checksumAddress);
          }
        } catch (error) {
          console.error("Error checking token address:", error);
          setPotentialTokenAddress(null);
        }
      }
    };

    checkForTokenAddress();
  }, [searchTerm, filteredTokens]);

  // Import detected token
  const handleImportToken = useCallback(() => {
    if (detectedToken) {
      // Add to custom tokens
      addCustomToken(detectedToken);

      // Select the token and close modal
      handleSelectToken(detectedToken);

      // Show success message
      showToast.success(`${detectedToken.symbol} imported successfully`);
    }
  }, [detectedToken, addCustomToken, handleSelectToken]);

  // Clear search and detection state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setPotentialTokenAddress(null);
    }
  }, [isOpen, setSearchTerm]);

  if (!isOpen) return null;

  // Generate token list based on the active tab
  // "all" tab: show core tokens first, then platform tokens
  // "stages" tab: show only platform tokens
  const currentTokens = getFilteredTokens(
    searchTerm
      ? activeTab === "all"
        ? filteredTokens.all
        : filteredTokens.platform
      : activeTab === "all"
      ? [...coreTokens, ...filteredTokens.platform]
      : filteredTokens.platform
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

            {/* Search input - */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or paste address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-[#1e1e2a] border border-[#20203a] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#836ef9] placeholder:text-gray-500"
              />
            </div>

            {/* Tabs  */}
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
                Stage
              </button>
            </div>

            {/* Token list or import section */}
            <div
              className="overflow-auto flex-grow"
              style={{ minHeight: "350px" }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-[350px] text-gray-400">
                  Loading tokens...
                </div>
              ) : potentialTokenAddress ? (
                isDetecting ? (
                  <div className="flex items-center justify-center h-[350px] text-gray-400">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#836EF9] mb-4"></div>
                      <p>Checking if address is a valid ERC20 token...</p>
                      <p className="text-xs mt-2 text-gray-500">
                        {potentialTokenAddress}
                      </p>
                    </div>
                  </div>
                ) : detectedToken ? (
                  <div className="p-4 h-[350px]">
                    <div className="mb-4 bg-indigo-900/20 border border-indigo-900/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">
                        Token found!
                      </h4>
                      <div className="text-sm text-gray-300 mb-4">
                        <p>
                          <span className="text-gray-400">Name:</span>{" "}
                          {detectedToken.name}
                        </p>
                        <p>
                          <span className="text-gray-400">Symbol:</span>{" "}
                          {detectedToken.symbol}
                        </p>
                        <p>
                          <span className="text-gray-400">Decimals:</span>{" "}
                          {detectedToken.decimals}
                        </p>
                        <p className="text-yellow-300 text-xs mt-3">
                          Warning: Make sure this is the correct token you want
                          to import. Anyone can create a token with any name or
                          symbol.
                        </p>
                      </div>
                      <PrimaryButton onClick={handleImportToken} fullWidth>
                        Import {detectedToken.symbol}
                      </PrimaryButton>
                    </div>
                  </div>
                ) : tokenValidationError ? (
                  <div className="p-4 h-[350px]">
                    <div className="mb-4 bg-red-900/20 border border-red-900/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">
                        Invalid Token Contract
                      </h4>
                      <div className="text-sm text-gray-300 mb-4">
                        <p>
                          The address you entered doesn't appear to be a valid
                          ERC20 token. Please make sure you entered the correct
                          contract address.
                        </p>
                        <p className="text-xs mt-3 text-gray-400">
                          Address: {potentialTokenAddress}
                        </p>
                      </div>
                      <PrimaryButton
                        onClick={() => setPotentialTokenAddress(null)}
                        fullWidth
                      >
                        Try Again
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-gray-400">
                    <div className="text-center">
                      <p>Looking up token information...</p>
                      <p className="text-xs mt-2 text-gray-500">
                        {potentialTokenAddress}
                      </p>
                    </div>
                  </div>
                )
              ) : currentTokens.length > 0 ? (
                <VirtualizedTokenList
                  tokens={currentTokens}
                  onSelectToken={handleSelectToken}
                  height={350}
                  emptyMessage={
                    searchTerm
                      ? "No tokens found. Try a different search term."
                      : `No ${
                          activeTab === "stages" ? "stage" : ""
                        } tokens found.`
                  }
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] px-6 py-8 text-center">
                  <ExclamationCircleIcon className="w-12 h-12 text-gray-500 mb-4" />
                  <p className="text-gray-400 text-base mb-2">
                    {searchTerm
                      ? "No tokens found. Try a different search term or paste a token address."
                      : `No ${
                          activeTab === "stages" ? "stage" : ""
                        } tokens found.`}
                  </p>
                  {searchTerm && (
                    <p className="text-gray-500 text-sm mt-2">
                      You can paste any valid ERC20 token address to add it to
                      your list.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add custom token modal - keeping for compatibility but it's now hidden */}
      <AddCustomToken
        isOpen={isAddTokenModalOpen}
        onClose={() => setIsAddTokenModalOpen(false)}
        onTokenAdded={handleSelectToken}
      />
    </>
  );
}
