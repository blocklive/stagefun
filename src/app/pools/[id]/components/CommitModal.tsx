"use client";

import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { DBTier } from "../../../../hooks/usePoolTiers";
import { toast } from "react-hot-toast";

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (tierId: string, amount: number) => Promise<void>;
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

  // Add logging for props and state
  console.log("CommitModal render:", {
    isOpen,
    isLoadingTiers,
    tiersData: tiers,
    selectedTierId,
    selectedTier,
  });

  const handleCommitAndClose = async () => {
    if (!selectedTierId) return;

    // Get the selected tier
    const selectedTier = tiers?.find((t) => t.id === selectedTierId);
    console.log("Handling commit with tier:", { selectedTierId, selectedTier });
    if (!selectedTier) return;

    // For fixed price tiers, use the tier's price
    const amount = selectedTier.is_variable_price
      ? parseFloat(commitAmount)
      : selectedTier.price;

    // Add logging for amount calculation
    console.log("Calculated commit amount:", {
      isVariablePrice: selectedTier.is_variable_price,
      inputAmount: commitAmount,
      tierPrice: selectedTier.price,
      finalAmount: amount,
    });

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Validate against tier constraints for variable price tiers
    if (selectedTier.is_variable_price) {
      if (selectedTier.min_price && amount < selectedTier.min_price) {
        toast.error(
          `Minimum commitment for this tier is ${selectedTier.min_price} USDC`
        );
        return;
      }
      if (selectedTier.max_price && amount > selectedTier.max_price) {
        toast.error(
          `Maximum commitment for this tier is ${selectedTier.max_price} USDC`
        );
        return;
      }
    }

    await onCommit(selectedTierId, amount);
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
                console.log("Rendering tier:", tier);
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
                      <p className="text-sm text-gray-400 mt-1">
                        {tier.description}
                      </p>
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
                    min={selectedTier.min_price || 0}
                    max={selectedTier.max_price || undefined}
                    step="0.01"
                  />
                </div>
              )}

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
                    (selectedTier?.is_variable_price && !commitAmount) ||
                    isApproving
                  }
                  className="px-6 py-3 rounded-xl bg-[#836EF9] text-white hover:bg-[#6B4EF9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Committing...</span>
                    </>
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
