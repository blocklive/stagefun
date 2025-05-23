"use client";

import React, { useState, useEffect } from "react";
import { Pool, User } from "../../../../lib/supabase";
import { formatCurrency } from "../../../../lib/utils";
import showToast from "@/utils/toast";
import { useContractInteraction } from "../../../../contexts/ContractInteractionContext";
import { ClaimDistributionButton } from "@/components/pools/ClaimDistributionButton";
import { ProvidePoolLiquidityButton } from "@/components/pools/ProvidePoolLiquidityButton";
import { getPoolEffectiveStatus } from "../../../../lib/contracts/types";
import { useAlphaMode } from "@/hooks/useAlphaMode";
import { useZerionLpBalance } from "@/hooks/useZerionLpBalance";

interface UserCommitmentProps {
  pool: Pool | null;
  dbUser: User | null;
  userCommitment: {
    user_id: string;
    pool_id: string;
    amount: number | string;
    created_at: string;
    user: User;
    onChain: boolean;
  } | null;
  isCommitmentsLoading?: boolean;
  commitmentsError?: any;
  commitAmount: string;
  isApproving: boolean;
  walletsReady: boolean;
  usdcBalance: string;
  setCommitAmount: (value: string) => void;
  handleCommit: () => Promise<void>;
  refreshBalance?: () => void;
  isUnfunded?: boolean;
  handleRefund?: () => Promise<void>;
  isRefunding?: boolean;
}

export default function UserCommitment({
  pool,
  dbUser,
  userCommitment,
  isCommitmentsLoading,
  commitmentsError,
  commitAmount,
  isApproving,
  walletsReady,
  usdcBalance,
  setCommitAmount,
  handleCommit,
  refreshBalance,
  isUnfunded = false,
  handleRefund,
  isRefunding = false,
}: UserCommitmentProps) {
  // State to track if we should show the error (only after a delay)
  const [showError, setShowError] = useState(false);

  // Helper function to format numbers with commas
  const formatNumber = (value: string): string => {
    // Ensure we're working with a valid number
    const num = parseFloat(value);
    if (isNaN(num)) {
      return "0";
    }

    // Format the number with commas as thousands separators
    // For whole numbers, show no decimal places
    // For numbers with decimal component, show up to 2 decimal places
    const hasDecimal = num % 1 !== 0;
    return num.toLocaleString(undefined, {
      maximumFractionDigits: hasDecimal ? 2 : 0,
      minimumFractionDigits: 0,
    });
  };

  // Get LP token balance using the Zerion-based hook for reliability
  // This avoids the "No embedded wallet found" error from direct contract calls
  const {
    lpBalance,
    formattedLpBalance,
    displayLpBalance,
    lpSymbol,
    isLoading: isLpBalanceLoading,
    refreshLpBalance,
  } = useZerionLpBalance(
    pool ? (pool as any)?.lp_token_address || null : null,
    pool?.ticker
  );

  // Determine if the pool is in executing state
  const isExecutingPool = pool
    ? getPoolEffectiveStatus(pool) === "EXECUTING"
    : false;

  // Determine if user can claim refund (must have LP tokens)
  const canClaimRefund = isUnfunded && lpBalance > BigInt(0);

  const { isAlphaMode } = useAlphaMode();

  // Reset error state when loading state changes
  useEffect(() => {
    if (isCommitmentsLoading) {
      setShowError(false);
    }
  }, [isCommitmentsLoading]);

  // Only show error after a significant delay to avoid flashing
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (commitmentsError && !isCommitmentsLoading) {
      // Wait 8 seconds before showing the error to give time for retries
      timer = setTimeout(() => {
        setShowError(true);
      }, 8000);
    } else {
      setShowError(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [commitmentsError, isCommitmentsLoading]);

  if (!pool || !dbUser) return null;

  // Show loading state while commitments are being fetched
  if (isCommitmentsLoading || (commitmentsError && !showError)) {
    return (
      <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
        <h3 className="text-lg font-semibold mb-4">Your Total Commitment</h3>
        <div className="p-3 rounded-[12px] bg-[#FFFFFF0F] flex justify-center">
          <div
            className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2"
            style={{ borderColor: "#836EF9" }}
          ></div>
        </div>
      </div>
    );
  }

  // Check if there was an error fetching commitments - only show after loading is complete AND delay has passed
  if (commitmentsError && showError) {
    return (
      <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
        <h3 className="text-lg font-semibold mb-4">Your Total Commitment</h3>
        <div className="p-3 rounded-[12px] bg-[#FFFFFF0F] text-center">
          <p className="text-red-400">
            Unable to fetch your token balance. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // If user hasn't committed to this pool, don't show the section
  if (!userCommitment) return null;

  // Handle refund button click if no handler is provided
  const onRefundClick = () => {
    if (!handleRefund) {
      showToast.error("Refund functionality is not available");
      return;
    }
    handleRefund()
      .then(() => {
        // Refresh LP balance after refund is processed
        setTimeout(() => {
          refreshLpBalance();
        }, 2000); // Add a small delay to ensure blockchain changes have been processed
      })
      .catch((error) => {
        console.error("Refund error:", error);
      });
  };

  return (
    <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
      <h3 className="text-xl font-semibold mb-4">Your Commitment</h3>
      <div className="p-4 rounded-[12px] bg-[#FFFFFF0F]">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Amount:</span>
          <div className="flex items-center">
            <span className="text-xl font-bold mr-2">
              {formatCurrency(
                parseFloat(userCommitment.amount.toString()) / 1000000
              )}
            </span>
            <span className="text-sm font-medium" style={{ color: "#836EF9" }}>
              {pool.currency}
            </span>
          </div>
        </div>

        {/* LP Token Balance - now shown for all pool types */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">LP Tokens:</span>
            <div className="flex items-center">
              <span className="text-lg font-bold mr-2">
                {isLpBalanceLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                ) : (
                  formatNumber(displayLpBalance)
                )}
              </span>
              {!isLpBalanceLoading && (
                <span
                  className="text-sm font-medium"
                  style={{ color: "#836EF9" }}
                >
                  {lpSymbol}
                </span>
              )}
            </div>
          </div>

          {/* Add the Provide Liquidity button when user has LP tokens and pool is funded, only in alpha mode */}
          {!isLpBalanceLoading &&
            lpBalance > BigInt(0) &&
            !isUnfunded &&
            isAlphaMode && (
              <ProvidePoolLiquidityButton
                lpTokenSymbol={lpSymbol || ""}
                lpTokenAddress={pool.lp_token_address || ""}
                amount={displayLpBalance || "0"}
                poolUniqueId={pool.id || ""}
              />
            )}
        </div>

        {/* Claim Distribution Button - for executing pools with revenue */}
        {isExecutingPool && lpBalance > BigInt(0) && (
          <div className="mt-4">
            <ClaimDistributionButton
              poolAddress={pool.contract_address || ""}
              isExecuting={isExecutingPool}
              onSuccess={() => {
                refreshLpBalance?.();
                showToast.success("Distribution claimed successfully!");
              }}
              className="w-full"
            />
            <p className="text-sm text-gray-400 mt-2">
              As a supporter of this pool, you can claim your share of revenue.
              Check back regularly as more funds may become available over time.
            </p>
          </div>
        )}

        {/* Refund button for unfunded pools */}
        {isUnfunded && (
          <div className="mt-4">
            {canClaimRefund ? (
              <>
                <button
                  onClick={onRefundClick}
                  disabled={isRefunding || !handleRefund}
                  className="w-full bg-[#836EF9] hover:bg-[#7058E8] text-white py-3 px-4 rounded-full font-medium transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {isRefunding ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Processing Refund...
                    </span>
                  ) : (
                    "Claim Refund"
                  )}
                </button>
                <p className="text-sm text-gray-400 mt-2">
                  This pool did not reach its target. You can claim a refund of
                  your committed funds.
                </p>
              </>
            ) : isLpBalanceLoading ? (
              <div className="flex justify-center p-2">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">
                You don't have any LP tokens to refund. You may have already
                claimed your refund.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
