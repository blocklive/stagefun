"use client";

import { useState, useEffect } from "react";
import { Pool, User } from "../../../../lib/supabase";
import { FaSync, FaTimes, FaPlus } from "react-icons/fa";

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Pool | null;
  dbUser: User | null;
  usdcBalance: string;
  commitAmount: string;
  isApproving: boolean;
  isUsingCache?: boolean;
  walletsReady?: boolean;
  handleMaxClick: () => void;
  handleCommit: () => Promise<void>;
  setCommitAmount: (value: string) => void;
  refreshBalance?: () => void;
}

export default function CommitModal({
  isOpen,
  onClose,
  pool,
  dbUser,
  usdcBalance,
  commitAmount,
  isApproving,
  isUsingCache = false,
  walletsReady = true,
  handleMaxClick,
  handleCommit,
  setCommitAmount,
  refreshBalance,
}: CommitModalProps) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  // Handle commit and close
  const handleCommitAndClose = async () => {
    await handleCommit();
    // Don't close the modal if there's an error - the error will be shown in a toast
    // The modal will be closed when the transaction is successful
  };

  if (!isOpen || !pool) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-[#000000] rounded-[16px] w-full max-w-md mx-4 overflow-hidden shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center">
          <div className="w-6"></div> {/* Spacer for centering */}
          <h2 className="text-xl font-bold text-white text-center flex-grow">
            Confirm commitment
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors w-6 flex justify-end"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              Enter the amount you want to commit to{" "}
              <span className="font-semibold text-white">{pool.name}</span>
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={commitAmount}
                onChange={(e) => setCommitAmount(e.target.value)}
                min={pool.min_commitment || 1}
                step="1"
                className="flex-1 py-3 px-4 rounded-[12px] bg-[#FFFFFF0F] text-white border border-gray-700 focus:outline-none focus:border-indigo-500 text-lg"
                placeholder={`Min: ${pool.min_commitment || 1}`}
              />
              <button
                onClick={handleMaxClick}
                className="px-4 py-3 rounded-[12px] bg-[#FFFFFF14] text-white hover:bg-[#FFFFFF20] transition-colors"
              >
                Max
              </button>
            </div>

            {/* Balance display */}
            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-gray-400">Your Balance:</span>
              <div className="flex items-center">
                <span className="font-medium text-gray-300">
                  {usdcBalance} {pool.currency}
                </span>
                {isUsingCache && (
                  <>
                    <span className="ml-2 text-xs text-amber-300">
                      (cached)
                    </span>
                    {refreshBalance && (
                      <button
                        onClick={refreshBalance}
                        className="ml-2 text-amber-300 hover:text-amber-200 transition-colors"
                        title="Refresh balance"
                      >
                        <FaSync className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pool info */}
          <div className="bg-[#FFFFFF0F] p-4 rounded-[12px] mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Pool Target:</span>
              <span className="font-medium">${pool.target_amount} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Minimum Commitment:</span>
              <span className="font-medium">
                ${pool.min_commitment || 1} USDC
              </span>
            </div>
          </div>

          {/* Commit button */}
          <div className="space-y-3">
            {/* Standard commit button */}
            <button
              onClick={handleCommitAndClose}
              disabled={
                isApproving ||
                !walletsReady ||
                !commitAmount ||
                parseFloat(commitAmount) <= 0
              }
              className={`w-full py-4 px-4 rounded-full font-medium text-lg flex items-center justify-center transition-all duration-200 ${
                isApproving ||
                !walletsReady ||
                !commitAmount ||
                parseFloat(commitAmount) <= 0
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-[#836EF9] text-white hover:bg-[#7058E8]"
              }`}
            >
              {isApproving ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                </div>
              ) : (
                "Commit"
              )}
            </button>

            {/* Wallet status messages */}
            {!walletsReady && (
              <p className="text-sm text-yellow-500 mt-2">
                Wallet not ready. Please wait...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
