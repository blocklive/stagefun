import React, { RefObject, useState, useEffect } from "react";
import { FaChevronLeft, FaCopy, FaCheck } from "react-icons/fa";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawAmount: string;
  withdrawAddress: string;
  isWithdrawing: boolean;
  onWithdraw: () => void;
  modalRef: RefObject<HTMLDivElement>;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  withdrawAmount,
  withdrawAddress,
  isWithdrawing,
  onWithdraw,
  modalRef,
}: WithdrawModalProps) {
  const [copied, setCopied] = useState(false);

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
    navigator.clipboard.writeText(withdrawAddress);
    setCopied(true);
  };

  // Shorten address to format: 0x1234...5678
  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-[#000000] rounded-[16px] w-full max-w-md overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 flex items-center">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#FFFFFF14] mr-4"
          >
            <FaChevronLeft className="text-white" />
          </button>
          <h2 className="text-xl font-bold text-white text-center flex-grow">
            Withdraw
          </h2>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Pool Icon and Amount */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center">
              <div className="bg-[#FFFFFF14] rounded-full p-2 mr-2">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
                  <path d="M10 4a1 1 0 100 2 1 1 0 000-2zm0 10a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
              </div>
              <div className="text-4xl font-bold text-white">
                {withdrawAmount
                  ? parseFloat(withdrawAmount).toFixed(2)
                  : "0.00"}
              </div>
            </div>
          </div>

          {/* Info Text */}
          <div className="mb-6 text-gray-400 text-sm">
            <p>
              You are withdrawing the full pool amount, including deposits and
              revenue. This is only available to the pool owner once the pool
              has reached its funding target.
            </p>
          </div>

          {/* Wallet Address Input */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">
              Withdrawal destination address
            </label>
            <div className="flex items-center">
              <div className="flex-grow bg-[#2A2A2A] text-white p-3 rounded-lg border border-gray-700 flex items-center overflow-hidden">
                <span className="text-gray-400">
                  {shortenAddress(withdrawAddress)}
                </span>
              </div>
              <button
                onClick={handleCopyAddress}
                className="ml-2 w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center transition-colors"
              >
                {copied ? (
                  <FaCheck className="text-green-500 w-4 h-4" />
                ) : (
                  <FaCopy className="text-white w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Withdraw Button */}
          <button
            onClick={onWithdraw}
            disabled={
              isWithdrawing ||
              !withdrawAmount ||
              parseFloat(withdrawAmount) <= 0
            }
            className="w-full bg-white text-black py-3 px-4 rounded-full font-semibold transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isWithdrawing ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Withdraw"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
