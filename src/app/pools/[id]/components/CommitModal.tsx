"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect, useMemo } from "react";
import { DBTier } from "../../../../hooks/usePoolTiers";
import showToast from "@/utils/toast";
import { ethers } from "ethers";
import {
  toUSDCBaseUnits,
  fromUSDCBaseUnits,
} from "@/lib/contracts/StageDotFunPool";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { useSmartWalletBalance } from "@/hooks/useSmartWalletBalance";
import Image from "next/image";
import { FaArrowRight } from "react-icons/fa";
import { useDeposit } from "@/hooks/useDeposit";

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  commitAmount: string;
  setCommitAmount: (value: string) => void;
  isApproving: boolean;
  tiers: any[] | null; // Changed type to accept tiers with commitments
  isLoadingTiers: boolean;
  poolAddress: string;
}

export default function CommitModal({
  isOpen,
  onClose,
  commitAmount,
  setCommitAmount,
  isApproving,
  tiers,
  isLoadingTiers,
  poolAddress,
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

  const { depositToPool, isLoading: isDepositing } = useDeposit();

  // Refresh balance when modal opens
  useEffect(() => {
    if (isOpen && smartWalletAddress) {
      refreshBalance();
    }
  }, [isOpen, smartWalletAddress, refreshBalance]);

  // Calculate tier stats using useMemo for performance
  const tierStats = useMemo(() => {
    if (!tiers) return new Map();

    const stats = new Map();

    tiers.forEach((tier) => {
      // Get the current number of commitments for this tier
      const currentPatrons = tier.commitments?.length || 0;

      // Get the maximum supply for this tier
      const maxPatrons = tier.max_supply || 100; // Default to 100 if not specified

      // Store in map for quick lookup
      stats.set(tier.id, { currentPatrons, maxPatrons });
    });

    return stats;
  }, [tiers]);

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

    // For variable price tiers, convert human input to base units
    // For fixed price tiers, use the base units price directly
    const amountInBaseUnits = foundTier.is_variable_price
      ? toUSDCBaseUnits(parseFloat(commitAmount))
      : BigInt(foundTier.price);

    // Get the contract tier ID (index in the array)
    const contractTierId = tiers?.indexOf(foundTier) ?? -1;
    if (contractTierId === -1) {
      console.error("❌ Could not determine contract tier ID");
      showToast.error("Invalid tier selected");
      return;
    }

    console.log("Handling commit with:", {
      selectedTierId,
      contractTierId,
      isVariablePriced: foundTier.is_variable_price,
      inputAmount: foundTier.is_variable_price
        ? commitAmount
        : fromUSDCBaseUnits(BigInt(foundTier.price)).toString(),
      amountInBaseUnits: amountInBaseUnits.toString(),
      tierPrice: foundTier.price,
      isNaN: isNaN(Number(amountInBaseUnits)),
      isZero: amountInBaseUnits === BigInt(0),
      minPrice: foundTier.min_price,
      maxPrice: foundTier.max_price,
    });

    // Validate amount
    if (
      amountInBaseUnits < BigInt(0) ||
      (!foundTier.is_variable_price &&
        amountInBaseUnits !== BigInt(foundTier.price))
    ) {
      console.log("❌ Amount validation failed");
      showToast.error("Please enter a valid amount");
      return;
    }

    // Handle variable price tier constraints
    if (foundTier.is_variable_price) {
      if (
        foundTier.min_price &&
        amountInBaseUnits < BigInt(foundTier.min_price) &&
        amountInBaseUnits !== BigInt(0)
      ) {
        console.log("❌ Below minimum price constraint");
        showToast.error(
          `Minimum commitment for this tier is ${fromUSDCBaseUnits(
            BigInt(foundTier.min_price)
          )} USDC`
        );
        return;
      }

      if (
        foundTier.max_price &&
        amountInBaseUnits > BigInt(foundTier.max_price)
      ) {
        console.log("❌ Above maximum price constraint");
        showToast.error(
          `Maximum commitment for this tier is ${fromUSDCBaseUnits(
            BigInt(foundTier.max_price)
          )} USDC`
        );
        return;
      }
    }

    try {
      // Call depositToPool with the pool address, amount in base units, and contract tier ID
      const result = await depositToPool(
        poolAddress,
        Number(amountInBaseUnits), // Convert BigInt to number for the contract call
        contractTierId // Use the array index as the contract tier ID
      );

      if (result.success) {
        console.log("✅ Deposit completed successfully:", result);
        onClose();
      } else {
        console.error("❌ Deposit failed:", result.error);
        showToast.error(result.error || "Failed to deposit");
      }
    } catch (error) {
      console.error("❌ Error in deposit:", error);
      showToast.error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
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
      // For fixed price tiers, check against the tier price in human readable format
      const tierPriceHuman = fromUSDCBaseUnits(
        BigInt(selectedTier.price)
      ).toString();
      return userBalance >= parseFloat(tierPriceHuman);
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
                // Get stats for this tier
                const stats = tierStats.get(tier.id) || {
                  currentPatrons: 0,
                  maxPatrons: tier.max_supply || 100,
                };

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
                          ? `${ethers.formatUnits(
                              tier.min_price?.toString() || "0",
                              6
                            )}-${ethers.formatUnits(
                              tier.max_price?.toString() || "0",
                              6
                            )} USDC`
                          : `${ethers.formatUnits(
                              tier.price?.toString() || "0",
                              6
                            )} USDC`}
                      </span>
                    </div>
                    {tier.description && (
                      <div
                        className="text-sm text-gray-400 mt-1"
                        dangerouslySetInnerHTML={{ __html: tier.description }}
                      />
                    )}
                    <div className="text-sm text-gray-400 mt-1">
                      {stats.currentPatrons} / {stats.maxPatrons} spots taken
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
                    placeholder={`Enter amount (${ethers.formatUnits(
                      selectedTier.min_price?.toString() || "0",
                      6
                    )}-${ethers.formatUnits(
                      selectedTier.max_price?.toString() || "0",
                      6
                    )} USDC)`}
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
                        parseFloat(
                          fromUSDCBaseUnits(
                            BigInt(selectedTier.price)
                          ).toString()
                        ) && (
                        <div className="mt-2 text-xs text-amber-400">
                          Your balance is less than the required amount for this
                          tier ({fromUSDCBaseUnits(BigInt(selectedTier.price))}{" "}
                          USDC)
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
                    isDepositing ||
                    !hasSufficientFunds()
                  }
                  className="px-6 py-3 rounded-xl bg-[#836EF9] text-white hover:bg-[#6B4EF9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDepositing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Depositing...</span>
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
