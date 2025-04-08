import React, { useState, useEffect } from "react";
import { useSmartWallet } from "../../../../hooks/useSmartWallet";
import { Pool, Tier } from "../../../../lib/types";
import Modal from "../../../components/Modal";
import {
  fromUSDCBaseUnits,
  toUSDCBaseUnits,
  formatUSDC,
} from "../../../../lib/contracts/StageDotFunPool";
import { useDeposit } from "../../../../hooks/useDeposit";
import {
  STRINGS,
  REWARD_TYPES,
  REWARD_TYPE_ICONS,
} from "../../../../lib/constants/strings";
import { formatAmount } from "@/lib/utils";
import showToast from "@/utils/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface CommitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: Tier;
  pool: Pool;
  usdcBalance: string;
  onRefreshBalance: () => void;
  onCommitSuccess?: () => void;
}

// Define the benefit interface to fix type issues
interface Benefit {
  id: string;
  description: string;
  tier_id: string;
}

// Define the reward item interface
interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  metadata?: any;
}

const CommitConfirmModal: React.FC<CommitConfirmModalProps> = ({
  isOpen,
  onClose,
  tier,
  pool,
  usdcBalance,
  onRefreshBalance,
  onCommitSuccess,
}) => {
  const [isCommitting, setIsCommitting] = useState(false);
  const { smartWalletAddress } = useSmartWallet();
  const { depositToPool, isLoading: isDepositLoading } = useDeposit();
  const [variableAmount, setVariableAmount] = useState("");

  // Reset variable amount when the modal opens or tier changes
  useEffect(() => {
    if (isOpen) {
      setVariableAmount("");
    }
  }, [isOpen, tier.id]);

  // Helper function to get the appropriate icon for a reward type
  const getRewardIcon = (type: string) => {
    return REWARD_TYPE_ICONS[type] || REWARD_TYPE_ICONS.DEFAULT;
  };

  // Check if this is a variable price tier
  const isVariablePrice = !!tier.is_variable_price;

  // Get min and max prices for variable price tiers in human-readable format
  const minPrice = tier.min_price
    ? fromUSDCBaseUnits(BigInt(tier.min_price))
    : null;
  const maxPrice = tier.max_price
    ? fromUSDCBaseUnits(BigInt(tier.max_price))
    : null;

  // For fixed price tiers, display price is the tier price
  // For variable price tiers with input, use the variable amount
  let displayPrice: number;
  if (isVariablePrice && variableAmount) {
    displayPrice = parseFloat(variableAmount);
  } else {
    displayPrice = fromUSDCBaseUnits(BigInt(tier.price));
  }

  // Generate price range display for variable price tiers
  let priceRangeDisplay: string = "";
  if (isVariablePrice) {
    if (minPrice !== null && maxPrice !== null) {
      priceRangeDisplay = `${formatAmount(minPrice)}-${formatAmount(
        maxPrice
      )} USDC`;
    } else if (minPrice !== null) {
      priceRangeDisplay = `${formatAmount(minPrice)}+ USDC`;
    } else if (maxPrice !== null) {
      priceRangeDisplay = `0-${formatAmount(maxPrice)} USDC`;
    } else {
      priceRangeDisplay = "Flexible USDC";
    }
  }

  // Format user balance for display
  const displayBalance = parseFloat(usdcBalance || "0").toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

  // Compare with human-readable balance
  const walletBalanceFloat = parseFloat(usdcBalance || "0");
  const insufficientFunds = walletBalanceFloat < displayPrice;

  // Variable price validation
  const variableAmountFloat = parseFloat(variableAmount || "0");
  const isVariableAmountValid =
    !isVariablePrice ||
    ((minPrice === null || variableAmountFloat >= minPrice) &&
      (maxPrice === null || variableAmountFloat <= maxPrice) &&
      variableAmountFloat > 0);

  // Combined validation
  const isCommitDisabled =
    insufficientFunds ||
    !isVariableAmountValid ||
    isCommitting ||
    isDepositLoading;

  // Add debug log when modal opens or balance changes
  useEffect(() => {
    if (isOpen) {
      console.log("Commit modal balance check:", {
        walletBalance: usdcBalance,
        walletBalanceFloat,
        tierPrice: tier.price,
        tierPriceInBaseUnits: BigInt(tier.price).toString(),
        displayPrice,
        insufficientFunds,
        comparison: `${walletBalanceFloat} < ${displayPrice}`,
        hasEnoughBalance: walletBalanceFloat >= displayPrice,
        isVariablePrice,
        variableAmount,
        minPrice,
        maxPrice,
        isVariableAmountValid,
      });
    }
  }, [
    isOpen,
    usdcBalance,
    tier.price,
    displayPrice,
    walletBalanceFloat,
    insufficientFunds,
    isVariablePrice,
    variableAmount,
    minPrice,
    maxPrice,
    isVariableAmountValid,
  ]);

  const handleCommit = async () => {
    if (!tier || !pool || isCommitting) return;

    if (isVariablePrice && !isVariableAmountValid) {
      return;
    }

    try {
      setIsCommitting(true);

      // Find the tier index in the pool.tiers array
      const tierIndex =
        pool.tiers?.findIndex((t: Tier) => t.id === tier.id) ?? -1;

      if (tierIndex === -1) {
        console.error("Tier not found in pool tiers");
        return;
      }

      // Calculate the amount to commit in base units
      let amountInBaseUnits: number;
      if (isVariablePrice && variableAmount) {
        // Convert human-readable input to base units
        amountInBaseUnits = Number(toUSDCBaseUnits(parseFloat(variableAmount)));
      } else {
        // Use the tier's fixed price
        amountInBaseUnits = Number(tier.price);
      }

      // Call depositToPool with the pool address, amount (in base units), and tierIndex
      const result = await depositToPool(
        pool.contract_address || "",
        amountInBaseUnits,
        tierIndex
      );

      if (result.success) {
        // Refresh balance after commitment
        onRefreshBalance();

        // Close modal
        onClose();

        // Call success callback if provided
        onCommitSuccess?.();
      } else {
        console.error("Deposit failed:", result.error);
        showToast.error("Failed to commit. Please try again.");
      }
    } catch (error) {
      console.error("Error committing to pool:", error);
      showToast.error("Failed to commit. Please try again.");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-lg w-full bg-[#15161A] rounded-[24px]">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Confirm commitment
        </h2>

        <div className="bg-[#FFFFFF0A] p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">{tier.name}</h3>
            <span className="text-lg font-semibold">{priceRangeDisplay}</span>
          </div>

          {/* Render tier description as HTML with proper styling */}
          <div
            className="text-white/70 text-sm mb-3 prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: tier.description }}
          />

          {/* Show NFT Pass and other rewards */}
          <div>
            <p className="text-sm font-medium mb-2">Benefits:</p>
            <ul className="space-y-1">
              {/* Always show Patron NFT Pass as the first benefit */}
              <li className="text-sm text-white/70 flex">
                <span className="mr-2">
                  {REWARD_TYPE_ICONS[REWARD_TYPES.NFT]}
                </span>
                <span>
                  <span className="font-medium">
                    {STRINGS.PATRON_PASS_NAME(tier.name)}
                  </span>
                </span>
              </li>

              {/* Show other reward items after the NFT Pass */}
              {tier.reward_items &&
                tier.reward_items.length > 0 &&
                tier.reward_items.map((reward: RewardItem, index: number) => (
                  <li key={index} className="text-sm text-white/70 flex">
                    <span className="mr-2">{getRewardIcon(reward.type)}</span>
                    <span>
                      <span className="font-medium">{reward.name}</span>
                      {reward.description && (
                        <div
                          className="text-white/70 text-sm"
                          dangerouslySetInnerHTML={{
                            __html: reward.description,
                          }}
                        />
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {isVariablePrice ? (
          <div className="mb-6">
            <div className="flex flex-col-reverse xs:flex-row xs:justify-between xs:items-baseline mb-2 gap-1">
              <label className="text-sm font-medium text-white/70">
                Enter amount (USDC)
              </label>
              <div className="text-sm text-white/70">
                Balance: {formatAmount(walletBalanceFloat)} USDC
              </div>
            </div>
            <input
              type="number"
              value={variableAmount}
              onChange={(e) => setVariableAmount(e.target.value)}
              className="w-full px-4 py-3 bg-[#FFFFFF0A] rounded-lg border border-[#FFFFFF1A] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
              placeholder={`Enter amount (${
                minPrice ? formatAmount(minPrice) : "0"
              }-${maxPrice ? formatAmount(maxPrice) : "∞"} USDC)`}
              min={minPrice !== null ? minPrice : 0}
              max={maxPrice !== null ? maxPrice : undefined}
              step="0.01"
            />
            {!isVariableAmountValid && variableAmount && (
              <p className="text-red-500 text-sm mt-1">
                {minPrice && variableAmountFloat < minPrice
                  ? `Minimum amount is ${formatAmount(minPrice)} USDC`
                  : maxPrice && variableAmountFloat > maxPrice
                  ? `Maximum amount is ${formatAmount(maxPrice)} USDC`
                  : "Please enter a valid amount"}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex flex-col-reverse xs:flex-row xs:justify-between xs:items-baseline gap-1 mb-2">
              <div className="text-sm font-medium text-white/70">
                Commit amount
              </div>
              <div className="text-sm text-white/70">
                Balance: {formatAmount(walletBalanceFloat)} USDC
              </div>
            </div>
            <div className="px-4 py-3 bg-[#FFFFFF0A] rounded-lg border border-[#FFFFFF1A] text-white">
              {formatAmount(displayPrice)} USDC
            </div>
          </div>
        )}

        <button
          onClick={handleCommit}
          disabled={isCommitDisabled}
          className={`w-full py-3 px-6 font-medium rounded-lg flex items-center justify-center transition-all duration-200 ${
            isCommitting
              ? "bg-gray-400 text-gray-700 opacity-70 transform scale-95 cursor-default shadow-inner border-2 border-gray-500"
              : "bg-white hover:bg-gray-100 text-[#15161A] hover:shadow-sm border border-transparent"
          }`}
        >
          {isCommitting ? (
            <div className="flex items-center">
              <LoadingSpinner color="#666666" size={14} />
              <span className="ml-2">Processing...</span>
            </div>
          ) : insufficientFunds ? (
            "Insufficient funds"
          ) : !isVariableAmountValid ? (
            "Invalid amount"
          ) : (
            "Commit"
          )}
        </button>

        {insufficientFunds && (
          <p className="text-red-500 text-sm mt-2 text-center">
            You need {formatAmount(displayPrice - walletBalanceFloat)} more USDC
            to commit to this tier
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 mt-3 bg-transparent border border-gray-600 hover:border-gray-500 text-white rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default CommitConfirmModal;
