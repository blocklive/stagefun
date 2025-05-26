import React, { useState, useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ethers } from "ethers";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { useSendNFT } from "@/hooks/useSendNFT";
import showToast from "@/utils/toast";
import Modal from "./Modal";
import { NFT } from "@/hooks/useWalletNFTs";

interface SendNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT | null;
  onSuccess?: () => void;
}

export default function SendNFTModal({
  isOpen,
  onClose,
  nft,
  onSuccess,
}: SendNFTModalProps) {
  const [destinationAddress, setDestinationAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const { smartWalletAddress } = useSmartWallet();

  // Use our custom hook for sending NFTs
  const { sendNFT, isSending, error } = useSendNFT();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDestinationAddress("");
      setAddressError("");
    }
  }, [isOpen]);

  const validateAddress = (address: string) => {
    if (!address) {
      setAddressError("Destination address is required");
      return false;
    }
    if (!ethers.isAddress(address)) {
      setAddressError("Invalid Ethereum address");
      return false;
    }
    setAddressError("");
    return true;
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setDestinationAddress(address);
    if (address) {
      validateAddress(address);
    } else {
      setAddressError("");
    }
  };

  const isValidAddress =
    destinationAddress && ethers.isAddress(destinationAddress);

  const handleSend = async () => {
    if (!nft || !smartWalletAddress) {
      showToast.error("No NFT or smart wallet available");
      return;
    }

    if (!validateAddress(destinationAddress)) {
      return;
    }

    // Log the details right before making the on-chain call
    console.log("[SendNFTModal] On-chain send call:", {
      destinationAddress,
      nft: {
        name: nft.name,
        tokenId: nft.tokenId,
        contractAddress: nft.contractAddress,
        tokenType: nft.tokenType,
      },
    });

    const result = await sendNFT({
      destinationAddress,
      nft,
    });

    if (result) {
      onClose();
      onSuccess?.();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send NFT">
      <div className="pt-2">
        {/* NFT Display */}
        {nft && (
          <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-32 rounded-lg overflow-hidden mb-4">
              {nft.image ? (
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{nft.name}</h3>
            <p className="text-gray-400 text-sm">{nft.collectionName}</p>
            <p className="text-gray-500 text-xs">Token ID: {nft.tokenId}</p>
          </div>
        )}

        {/* Destination Address Input */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={destinationAddress}
              onChange={handleAddressChange}
              placeholder="Enter wallet address (on Monad)"
              className={`w-full px-4 py-4 pr-12 bg-[#FFFFFF14] text-white rounded-lg border-none focus:outline-none focus:ring-1 ${
                isValidAddress
                  ? "focus:ring-[#9EEB00]"
                  : addressError
                  ? "focus:ring-red-500"
                  : "focus:ring-[#444444]"
              } placeholder-gray-500`}
            />
            {isValidAddress && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <FaCheckCircle className="h-5 w-5 text-[#9EEB00]" />
              </div>
            )}
          </div>
          {/* Error message - fixed height container to prevent UI shifting */}
          <div className="h-5 mt-1">
            {addressError && (
              <p className="text-red-500 text-sm">{addressError}</p>
            )}
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isSending || !destinationAddress || !!addressError || !nft}
          className="w-full bg-white text-black py-3 px-4 h-11 rounded-full font-semibold transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <span className="flex items-center justify-center">
              <LoadingSpinner color="#666666" size={14} />
              <span className="ml-2">Processing...</span>
            </span>
          ) : (
            "Send NFT"
          )}
        </button>
      </div>
    </Modal>
  );
}
