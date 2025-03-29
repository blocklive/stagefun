"use client";

import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { DBTier } from "../../../../hooks/usePoolTiers";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import { toUSDCBaseUnits } from "@/lib/contracts/StageDotFunPool";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { useSmartWalletBalance } from "@/hooks/useSmartWalletBalance";

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (tierId: string, amount: string) => Promise<void>;
  commitAmount: string;
  setCommitAmount: (value: string) => void;
  isApproving: boolean;
  tiers: DBTier[] | null;
  isLoadingTiers: boolean;
}

export default function CommitModal({
  isOpen,
  onClose,
  onCommit,
  commitAmount,
  setCommitAmount,
  isApproving,
  tiers,
  isLoadingTiers,
}: CommitModalProps) {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const selectedTier = selectedTierId
    ? tiers?.find((t) => t.id === selectedTierId)
    : null;

  const { smartWalletAddress } = useSmartWallet();
  const {
    balance: smartWalletBalance,
    isLoading: isLoadingBalance,
    refresh: refreshBalance,
  } = useSmartWalletBalance();

  const walletToUse = smartWalletAddress
    ? "Smart Wallet (Gas Free)"
    : "Embedded Wallet";

  // Refresh balance when modal opens
  useEffect(() => {
    if (isOpen && smartWalletAddress) {
      refreshBalance();
    }
  }, [isOpen, smartWalletAddress, refreshBalance]);

  const handleCommitAndClose = async () => {
    if (!selectedTierId) {
      console.log("❌ No tier selected");
      return;
    }

    // Get the selected tier
    const foundTier = tiers?.find((t) => t.id === selectedTierId);
    console.log("Handling commit with tier:", {
      selectedTierId,
      selectedTier: foundTier,
    });
    if (!foundTier) {
      console.log("❌ Selected tier not found");
      return;
    }

    const amount = foundTier.is_variable_price
      ? commitAmount
      : foundTier.price.toString();

    console.log("Handling commit with:", {
      selectedTierId,
      isVariablePriced: foundTier.is_variable_price,
      inputAmount: amount,
      tierPrice: foundTier.price,
      finalAmount: amount,
      amountAsNumber: parseFloat(amount),
      isNaN: isNaN(parseFloat(amount)),
      isLessThanZero: parseFloat(amount) < 0,
      isZero: parseFloat(amount) === 0,
      isZeroVariablePrice:
        parseFloat(amount) === 0 && foundTier.is_variable_price,
      isZeroAndNotVariablePrice:
        parseFloat(amount) === 0 && !foundTier.is_variable_price,
      minPrice: foundTier.min_price,
      maxPrice: foundTier.max_price,
    });

    // Validate amount
    if (
      isNaN(parseFloat(amount)) ||
      parseFloat(amount) < 0 ||
      (parseFloat(amount) === 0 && !foundTier.is_variable_price)
    ) {
      console.log("❌ Amount validation failed");
      toast.error("Please enter a valid amount");
      return;
    }

    console.log("✅ Amount validation passed");

    // Validate against tier constraints for variable price tiers
    if (foundTier.is_variable_price) {
      console.log("Checking variable price tier constraints");

      // Check min price constraint
      if (
        foundTier.min_price !== null &&
        foundTier.min_price > 0 &&
        parseFloat(amount) < foundTier.min_price
      ) {
        console.log("❌ Below minimum price constraint");
        toast.error(
          `Minimum commitment for this tier is ${foundTier.min_price} USDC`
        );
        return;
      }

      // Check max price constraint
      if (foundTier.max_price && parseFloat(amount) > foundTier.max_price) {
        console.log("❌ Above maximum price constraint");
        toast.error(
          `Maximum commitment for this tier is ${foundTier.max_price} USDC`
        );
        return;
      }

      console.log("✅ Variable price tier constraints passed");
    }

    console.log("🚀 Calling onCommit with:", {
      tierId: selectedTierId,
      amount: amount,
    });

    try {
      // Pass the human-readable amount to onCommit
      console.log(
        `🔥 Calling onCommit with tierId: ${selectedTierId}, amount: ${amount}, amountType: ${typeof amount}, parseFloat: ${parseFloat(
          amount
        )}`
      );
      await onCommit(selectedTierId, amount);
      console.log("✅ onCommit completed successfully");
    } catch (error) {
      console.error("❌ Error in onCommit:", error);
    }
  };

  // Add a function to check if the user has sufficient funds
  const hasSufficientFunds = () => {
    // If no tier is selected or balance is loading, don't show any warning
    if (!selectedTierId || !selectedTier || isLoadingBalance) return true;

    const userBalance = parseFloat(smartWalletBalance || "0");

    if (selectedTier.is_variable_price) {
      // For variable price tiers, check against the entered amount
      // If amount is 0 or empty, consider it sufficient
      return (
        !commitAmount ||
        parseFloat(commitAmount) === 0 ||
        userBalance >= parseFloat(commitAmount)
      );
    } else {
      // For fixed price tiers, check against the tier price
      return userBalance >= selectedTier.price;
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-[20px] bg-[#1E1F23] p-6 text-white">
          <Dialog.Title className="text-2xl font-bold mb-6">
            Choose Your Tier
          </Dialog.Title>

          {isLoadingTiers ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#836EF9]"></div>
            </div>
          ) : tiers ? (
            <div className="space-y-4">
              {tiers.map((tier) => {
                // Add logging for each tier being rendered
                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                      selectedTierId === tier.id
                        ? "border-[#836EF9] bg-[#836EF914]"
                        : "border-[#FFFFFF1A] hover:border-[#836EF9] hover:bg-[#836EF90A]"
                    }`}
                    onClick={() => setSelectedTierId(tier.id)}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{tier.name}</h3>
                      <span className="text-[#836EF9]">
                        {tier.is_variable_price
                          ? `${tier.min_price}-${tier.max_price} USDC`
                          : `${tier.price} USDC`}
                      </span>
                    </div>
                    {tier.description && (
                      <div
                        className="text-sm text-gray-400 mt-1"
                        dangerouslySetInnerHTML={{ __html: tier.description }}
                      />
                    )}
                    <div className="text-sm text-gray-400 mt-1">
                      {(tier as any).currentPatrons} /{" "}
                      {(tier as any).maxPatrons} spots taken
                    </div>
                  </div>
                );
              })}

              {/* Only show amount input for variable price tiers */}
              {selectedTier?.is_variable_price && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (USDC)
                  </label>
                  <input
                    type="number"
                    value={commitAmount}
                    onChange={(e) => setCommitAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF1A] text-white placeholder-gray-500 focus:outline-none focus:border-[#836EF9] focus:ring-1 focus:ring-[#836EF9]"
                    placeholder={`Enter amount (${selectedTier.min_price}-${selectedTier.max_price} USDC)`}
                    min={0}
                    max={selectedTier.max_price || undefined}
                    step="0.01"
                  />
                </div>
              )}

              {/* Balance always shown */}
              <div className="mt-4 p-3 bg-[#FFFFFF08] rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">Your balance:</div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">
                      {isLoadingBalance ? (
                        <span className="inline-block w-16 h-4 bg-gray-700 animate-pulse rounded"></span>
                      ) : (
                        `${smartWalletBalance || "0"} USDC`
                      )}
                    </span>
                  </div>
                </div>

                {/* Only show warnings if a tier is selected */}
                {selectedTier && selectedTier.id === selectedTierId && (
                  <>
                    {!selectedTier.is_variable_price &&
                      parseFloat(smartWalletBalance || "0") <
                        selectedTier.price && (
                        <div className="mt-2 text-xs text-amber-400">
                          Your balance is less than the required amount for this
                          tier ({selectedTier.price} USDC)
                        </div>
                      )}

                    {selectedTier.is_variable_price &&
                      commitAmount &&
                      parseFloat(commitAmount) > 0 &&
                      parseFloat(smartWalletBalance || "0") <
                        parseFloat(commitAmount) && (
                        <div className="mt-2 text-xs text-amber-400">
                          Your balance is less than the amount you entered
                        </div>
                      )}
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl border border-[#FFFFFF1A] text-white hover:bg-[#FFFFFF0A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitAndClose}
                  disabled={
                    !selectedTierId ||
                    (selectedTier?.is_variable_price &&
                      commitAmount !== "0" &&
                      !commitAmount) ||
                    isApproving ||
                    !hasSufficientFunds()
                  }
                  className="px-6 py-3 rounded-xl bg-[#836EF9] text-white hover:bg-[#6B4EF9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Committing...</span>
                    </>
                  ) : !selectedTierId ? (
                    "Select a Tier"
                  ) : !hasSufficientFunds() ? (
                    "Insufficient Balance"
                  ) : (
                    "Commit"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#836EF9]"></div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
