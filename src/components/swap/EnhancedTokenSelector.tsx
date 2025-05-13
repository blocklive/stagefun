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
import { useAlphaModeValue } from "@/hooks/useAlphaModeValue";

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
  const isAlphaMode = useAlphaModeValue();

  const [activeTab, setActiveTab] = useState<"core" | "stages">("core");
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);
  const [potentialTokenAddress, setPotentialTokenAddress] = useState<
    string | null
  >(null);
  const [detectedToken, setDetectedToken] = useState<Token | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const {
    filteredTokens,
    coreTokens,
    searchTerm,
    setSearchTerm,
    isLoading,
    markTokenAsRecent,
  } = useTokenList({ onlyMainTokens });

  const { validateAndFetchToken, isLoading: isTokenFetchLoading } =
    useTokenFetcher();
  const { addCustomToken } = useTokenStorage();

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
      // Reset detected token when search changes
      setDetectedToken(null);

      // If search term is empty or too short, do nothing
      if (!searchTerm || searchTerm.length < 10) {
        setPotentialTokenAddress(null);
        return;
      }

      // Check if it looks like an Ethereum address
      if (searchTerm.startsWith("0x") && searchTerm.length >= 40) {
        try {
          // See if it's a valid address format
          if (ethers.isAddress(searchTerm)) {
            const checksumAddress = ethers.getAddress(searchTerm);

            // Check if this token is already in our list
            const allTokens = [
              ...filteredTokens.all,
              ...filteredTokens.platform,
            ];
            const tokenExists = allTokens.some(
              (token) =>
                token.address.toLowerCase() === checksumAddress.toLowerCase()
            );

            if (tokenExists) {
              // Token exists, no need to import
              setPotentialTokenAddress(null);
            } else {
              // Potentially new token - set address to check
              setPotentialTokenAddress(checksumAddress);

              // Try to fetch token data
              setIsDetecting(true);
              const token = await validateAndFetchToken(checksumAddress);
              setIsDetecting(false);

              if (token) {
                // Valid token found
                setDetectedToken(token);
              } else {
                // Not a valid token
                setDetectedToken(null);
              }
            }
          } else {
            setPotentialTokenAddress(null);
          }
        } catch (error) {
          console.error("Error checking token address:", error);
          setPotentialTokenAddress(null);
        }
      } else {
        setPotentialTokenAddress(null);
      }
    };

    checkForTokenAddress();
  }, [searchTerm, filteredTokens, validateAndFetchToken]);

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
      setDetectedToken(null);
      setPotentialTokenAddress(null);
    }
  }, [isOpen, setSearchTerm]);

  if (!isOpen) return null;

  // Use core tokens for the "core" tab, and platform tokens for the "stages" tab
  // For non-alpha users, we always show just the core tokens regardless of tab
  const currentTokens = getFilteredTokens(
    !isAlphaMode || activeTab === "core" ? coreTokens : filteredTokens.platform
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

            {/* Search input - Only show in alpha mode */}
            {isAlphaMode && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or paste address"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e1e2a] border border-[#20203a] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#836ef9] placeholder:text-gray-500"
                />
              </div>
            )}

            {/* Tabs - Only show if in alpha mode */}
            {isAlphaMode && (
              <div className="flex">
                <button
                  className={`px-4 py-3 text-sm font-medium flex-1 ${
                    activeTab === "core"
                      ? "text-white border-b-2 border-[#836ef9]"
                      : "text-gray-400 hover:text-white border-b-0"
                  }`}
                  onClick={() => setActiveTab("core")}
                >
                  Core
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
            )}

            {/* Token list or import section */}
            <div
              className="overflow-auto flex-grow"
              style={{ minHeight: "350px" }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-[350px] text-gray-400">
                  Loading tokens...
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
                        Warning: Make sure this is the correct token you want to
                        import. Anyone can create a token with any name or
                        symbol.
                      </p>
                    </div>
                    <PrimaryButton onClick={handleImportToken} fullWidth>
                      Import {detectedToken.symbol}
                    </PrimaryButton>
                  </div>
                </div>
              ) : isDetecting ? (
                <div className="flex items-center justify-center h-[350px] text-gray-400">
                  Checking address...
                </div>
              ) : currentTokens.length > 0 ? (
                <VirtualizedTokenList
                  tokens={currentTokens}
                  onSelectToken={handleSelectToken}
                  height={350}
                  emptyMessage={
                    searchTerm
                      ? "No tokens found. Try a different search term."
                      : `No ${
                          activeTab === "stages" ? "stage" : "core"
                        } tokens found.`
                  }
                />
              ) : potentialTokenAddress ? (
                <div className="flex items-center justify-center h-[350px] text-gray-400">
                  No tokens found. Checking if address is valid...
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] px-6 py-8 text-center">
                  <ExclamationCircleIcon className="w-12 h-12 text-gray-500 mb-4" />
                  <p className="text-gray-400 text-base">
                    {searchTerm
                      ? "No tokens found. Try a different search term."
                      : `No ${
                          activeTab === "stages" ? "stage" : "core"
                        } tokens found.`}
                  </p>
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
