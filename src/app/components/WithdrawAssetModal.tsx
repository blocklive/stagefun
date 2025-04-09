import React, { useState, useEffect, useRef } from "react";
import {
  FaChevronLeft,
  FaCopy,
  FaCheck,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ethers } from "ethers";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { getUSDCContract } from "@/lib/contracts/StageDotFunPool";
import showToast from "@/utils/toast";
import Modal from "./Modal";
import { formatAmount } from "@/lib/utils";

interface WithdrawAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    name: string;
    symbol: string;
    balance: string;
  } | null;
  onSuccess?: () => void;
}

export default function WithdrawAssetModal({
  isOpen,
  onClose,
  asset,
  onSuccess,
}: WithdrawAssetModalProps) {
  const [destinationAddress, setDestinationAddress] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [copied, setCopied] = useState(false);
  const { smartWalletAddress, callContractFunction } = useSmartWallet();
  const [amount, setAmount] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDestinationAddress("");
      setAddressError("");
      setAmountError("");
      setAmount("");
    }
  }, [isOpen]);

  // Reset copied state after 3 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyAddress = () => {
    if (destinationAddress) {
      navigator.clipboard.writeText(destinationAddress);
      setCopied(true);
    }
  };

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

  // Handle amount input changes
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountError("");

    // Only allow numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);

      // Check if amount exceeds balance
      if (asset && value) {
        const inputAmount = parseFloat(value);
        if (!isNaN(inputAmount)) {
          const maxAmount = parseFloat(asset.balance);

          if (inputAmount > maxAmount) {
            setAmountError(
              `Maximum amount is ${formatAmount(maxAmount)} ${asset.symbol}`
            );
            // Don't cap the amount automatically for better UX - let users see their error
          }
        }
      }
    }
  };

  // Handle percentage button clicks
  const handlePercentageClick = (percentage: number) => {
    if (!asset) return;

    const maxAmount = parseFloat(asset.balance);
    const calculatedAmount = ((maxAmount * percentage) / 100).toFixed(3);
    setAmount(calculatedAmount);
    setAmountError(""); // Clear any errors when using preset buttons
  };

  // Handle Max button click
  const handleMaxClick = () => {
    if (!asset) return;
    setAmount(asset.balance);
    setAmountError(""); // Clear any errors when using Max button
  };

  const handleWithdraw = async () => {
    if (!asset || !smartWalletAddress) {
      showToast.error("No asset or smart wallet available");
      return;
    }

    if (!validateAddress(destinationAddress)) {
      return;
    }

    // Validate amount
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setAmountError("Please enter a valid amount");
      return;
    }

    const maxAmount = parseFloat(asset.balance);
    if (withdrawAmount > maxAmount) {
      setAmountError(
        `Maximum amount is ${formatAmount(maxAmount)} ${asset.symbol}`
      );
      return;
    }

    try {
      setIsWithdrawing(true);
      const loadingToast = showToast.loading("Processing withdrawal...");

      // Get the RPC provider
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      // Get USDC contract (read-only for validation)
      const usdcContract = getUSDCContract(provider);
      const usdcTokenAddress = await usdcContract.getAddress();

      // Convert amount to USDC base units (6 decimals)
      const amountInBaseUnits = ethers.parseUnits(withdrawAmount.toString(), 6);

      // Use the smart wallet to transfer the funds
      const result = await callContractFunction(
        usdcTokenAddress as `0x${string}`,
        ["function transfer(address to, uint256 amount) returns (bool)"],
        "transfer",
        [destinationAddress, amountInBaseUnits],
        `Transferring ${withdrawAmount} ${asset.symbol} to ${destinationAddress}`
      );

      if (result.success) {
        showToast.success("Asset successfully withdrawn!", {
          id: loadingToast,
        });
        onClose();
        onSuccess?.();
      } else {
        throw new Error(result.error || "Failed to withdraw asset");
      }
    } catch (error) {
      console.error("Error withdrawing asset:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to withdraw asset"
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Withdraw">
      <div className="pt-2">
        {/* Direct Amount Input with Currency Display */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center text-5xl font-bold text-white mb-2">
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="bg-transparent text-right border-none focus:outline-none w-40 text-5xl font-bold text-white placeholder-gray-600"
            />
            <span className="text-white ml-2">{asset?.symbol || "USDC"}</span>
          </div>
          {asset && (
            <div className="text-sm text-gray-400">
              Balance: {formatAmount(parseFloat(asset.balance))} {asset.symbol}
            </div>
          )}

          {/* Error message - height is reserved even when no error */}
          <div className="h-5 mt-1">
            {amountError && (
              <p className="text-red-500 text-sm">{amountError}</p>
            )}
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex justify-between gap-2 mb-8">
          <button
            onClick={() => handlePercentageClick(10)}
            className="flex-1 py-3 h-11 bg-[#FFFFFF14] rounded-full text-white font-medium hover:bg-[#FFFFFF29]"
          >
            10%
          </button>
          <button
            onClick={() => handlePercentageClick(50)}
            className="flex-1 py-3 h-11 bg-[#FFFFFF14] rounded-full text-white font-medium hover:bg-[#FFFFFF29]"
          >
            50%
          </button>
          <button
            onClick={handleMaxClick}
            className="flex-1 py-3 h-11 bg-[#FFFFFF14] rounded-full text-white font-medium hover:bg-[#FFFFFF29]"
          >
            Max
          </button>
        </div>

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

        {/* Withdraw Button */}
        <button
          onClick={handleWithdraw}
          disabled={
            isWithdrawing ||
            !destinationAddress ||
            !!addressError ||
            !!amountError ||
            !amount ||
            parseFloat(amount) <= 0
          }
          className="w-full bg-white text-black py-3 px-4 h-11 rounded-full font-semibold transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {isWithdrawing ? (
            <span className="flex items-center justify-center">
              <LoadingSpinner color="#666666" size={14} />
              <span className="ml-2">Processing...</span>
            </span>
          ) : (
            "Withdraw"
          )}
        </button>
      </div>
    </Modal>
  );
}
