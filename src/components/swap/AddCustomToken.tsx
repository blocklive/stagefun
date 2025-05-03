import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTokenFetcher } from "@/hooks/useTokenFetcher";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import { Token } from "@/types/token";
import showToast from "@/utils/toast";

interface AddCustomTokenProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenAdded?: (token: Token) => void;
}

export function AddCustomToken({
  isOpen,
  onClose,
  onTokenAdded,
}: AddCustomTokenProps) {
  const [tokenAddress, setTokenAddress] = useState("");
  const { validateAndFetchToken, isLoading, error } = useTokenFetcher();
  const { addCustomToken } = useTokenStorage();

  const handleAddToken = async () => {
    try {
      const token = await validateAndFetchToken(tokenAddress);

      if (token) {
        addCustomToken(token);
        showToast.success(`${token.symbol} added successfully`);
        setTokenAddress("");
        onTokenAdded?.(token);
        onClose();
      }
    } catch (error) {
      console.error("Failed to add token:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-[#1e1e2a] rounded-xl shadow-lg max-w-md w-full mx-4 p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Add Custom Token</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <label
            className="block text-gray-300 text-sm mb-2"
            htmlFor="tokenAddress"
          >
            Token Contract Address
          </label>
          <input
            id="tokenAddress"
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#836ef9] focus:border-transparent"
          />
          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end">
          <PrimaryButton
            onClick={handleAddToken}
            disabled={!tokenAddress || isLoading}
            isLoading={isLoading}
          >
            {isLoading ? "Importing..." : "Import Token"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
