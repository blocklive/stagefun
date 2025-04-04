import React, { useState, useEffect } from "react";
import { useSmartWallet } from "../../../../hooks/useSmartWallet";
import { Pool, Tier } from "../../../../lib/types";
import Modal from "../../../components/Modal";
import {
  fromUSDCBaseUnits,
  toUSDCBaseUnits,
} from "../../../../lib/contracts/StageDotFunPool";
import { useDeposit } from "../../../../hooks/useDeposit";
import {
  STRINGS,
  REWARD_TYPES,
  REWARD_TYPE_ICONS,
} from "../../../../lib/constants/strings";

interface CommitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: Tier;
  pool: Pool;
  usdcBalance: string;
  onRefreshBalance: () => void;
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

  // Helper to format USDC amounts with 2 decimal places
  const formatUSDC = (amount: number) => {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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
    if (!tier || !pool || !smartWalletAddress) return;

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

        // Close modal after successful commitment
        onClose();
      } else {
        console.error("Deposit failed:", result.error);
      }
    } catch (error) {
      console.error("Error committing to pool:", error);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm commitment">
      <div className="p-4">
        {!isVariablePrice && (
          <div className="mb-6 text-center">
            <div className="text-3xl font-bold mb-1">
              {formatUSDC(displayPrice)}
            </div>
            <div className="text-sm text-white/70">USDC</div>
          </div>
        )}

        {/* Display wallet balance */}
        <div className="mb-6 text-center">
          <div className="text-sm text-white/70">Your wallet balance:</div>
          <div className="text-lg font-medium">{displayBalance} USDC</div>
        </div>

        <div className="bg-[#FFFFFF0A] p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">{tier.name}</h3>
            {isVariablePrice && (
              <span className="text-sm text-white/70">
                {minPrice !== null && maxPrice !== null
                  ? `Range: ${formatUSDC(minPrice)}-${formatUSDC(
                      maxPrice
                    )} USDC`
                  : "Flexible amount"}
              </span>
            )}
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
                  <div className="text-white/70 text-sm">
                    {STRINGS.PATRON_PASS_DESCRIPTION}
                  </div>
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

        {/* Variable price input moved here, right before the commit button */}
        {isVariablePrice && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Enter amount (USDC)
            </label>
            <input
              type="number"
              value={variableAmount}
              onChange={(e) => setVariableAmount(e.target.value)}
              className="w-full px-4 py-3 bg-[#FFFFFF0A] rounded-lg border border-[#FFFFFF1A] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
              placeholder={`Enter amount (${
                minPrice ? formatUSDC(minPrice) : "0"
              }-${maxPrice ? formatUSDC(maxPrice) : "∞"} USDC)`}
              min={minPrice !== null ? minPrice : 0}
              max={maxPrice !== null ? maxPrice : undefined}
              step="0.01"
            />
            {!isVariableAmountValid && variableAmount && (
              <p className="text-red-500 text-sm mt-1">
                {minPrice && variableAmountFloat < minPrice
                  ? `Minimum amount is ${formatUSDC(minPrice)} USDC`
                  : maxPrice && variableAmountFloat > maxPrice
                  ? `Maximum amount is ${formatUSDC(maxPrice)} USDC`
                  : "Please enter a valid amount"}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleCommit}
          disabled={isCommitDisabled}
          className={`w-full py-3 rounded-lg font-medium ${
            isCommitDisabled
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-[#836EF9] hover:bg-[#6F5BD0]"
          }`}
        >
          {isCommitting || isDepositLoading ? (
            <div className="flex justify-center items-center">
              <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
              Processing...
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
            You need {formatUSDC(displayPrice - walletBalanceFloat)} more USDC
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
