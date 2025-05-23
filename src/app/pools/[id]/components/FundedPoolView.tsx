"use client";

import { Pool } from "../../../../lib/supabase";
import TabsAndSocial from "./TabsAndSocial";
import { formatCurrency } from "../../../../lib/utils";
import {
  fromUSDCBaseUnits,
  USDC_DECIMAL_FACTOR,
} from "../../../../lib/contracts/StageDotFunPool";
import {
  PoolStatus,
  getPoolStatusFromNumber,
} from "../../../../lib/contracts/types";
import { useMemo } from "react";
import { MAX_SAFE_VALUE } from "@/lib/utils/contractValues";

type TabType = "overview" | "patrons" | "updates";

interface FundedPoolViewProps {
  pool: Pool;
  renderUserCommitment: () => React.ReactNode;
  renderPoolFunds: () => React.ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  raisedAmount: number | string | bigint;
  targetReachedTimestamp?: number;
  isCreator?: boolean;
  onManageClick?: () => void;
  patronCount?: number;
}

export default function FundedPoolView({
  pool,
  renderUserCommitment,
  renderPoolFunds,
  activeTab = "overview",
  onTabChange,
  raisedAmount,
  targetReachedTimestamp,
  isCreator = false,
  onManageClick,
  patronCount: externalPatronCount,
}: FundedPoolViewProps) {
  const fundedDate = targetReachedTimestamp
    ? new Date(targetReachedTimestamp * 1000).toLocaleDateString()
    : new Date(pool.ends_at).toLocaleDateString();

  // Check if pool is in executing status
  const isExecuting =
    pool.status === "executing" ||
    getPoolStatusFromNumber(pool.status) === PoolStatus.EXECUTING;

  // Get cap amount display for UI
  const displayCapAmount = useMemo(() => {
    if (!pool.cap_amount) return "";

    // If cap amount matches MAX_SAFE_VALUE, it's uncapped
    if (String(pool.cap_amount) === MAX_SAFE_VALUE) return "Unlimited";

    // If cap amount is in base units (typically large numbers like 1000000 for $1M)
    try {
      // Convert to appropriate dollar amount
      const amountInDollars = pool.cap_amount / 1000000; // Convert from USDC base units to dollars
      return amountInDollars.toLocaleString();
    } catch (e) {
      console.error("Error formatting cap amount:", e);
      return pool.cap_amount.toString();
    }
  }, [pool.cap_amount]);

  // Convert raised amount to human readable format
  const displayRaisedAmount = useMemo(() => {
    // If raisedAmount is falsy, show 0
    if (!raisedAmount) return "0";

    try {
      // Assume raisedAmount is in base units and convert to BigInt
      const raisedAmountBigInt = BigInt(raisedAmount);

      // Simple conversion from base units to human readable
      return fromUSDCBaseUnits(raisedAmountBigInt).toLocaleString();
    } catch (e) {
      console.error("Error converting raised amount:", e, raisedAmount);
      return "0";
    }
  }, [raisedAmount]);

  // Check if target amount exceeds cap amount
  const targetExceedsCap = useMemo(() => {
    if (!pool.cap_amount || pool.cap_amount === 0) return false;
    return pool.target_amount > pool.cap_amount;
  }, [pool.target_amount, pool.cap_amount]);

  // Calculate the number of patrons
  const patronCount = useMemo(() => {
    if (externalPatronCount !== undefined) {
      return externalPatronCount;
    }

    if (!pool || !pool.tiers) return 0;

    // Track unique patron addresses to avoid counting the same patron multiple times
    const uniquePatrons = new Set();

    // Gather unique user addresses across all tiers
    (pool.tiers as any[]).forEach((tier: any) => {
      if (tier.commitments && Array.isArray(tier.commitments)) {
        tier.commitments.forEach((commitment: any) => {
          if (commitment.user_address) {
            uniquePatrons.add(commitment.user_address.toLowerCase());
          }
        });
      }
    });

    return uniquePatrons.size;
  }, [pool, externalPatronCount]);

  return (
    <>
      {/* Tabs and Social Links */}
      <TabsAndSocial
        activeTab={activeTab}
        onTabChange={onTabChange}
        pool={pool}
        isCreator={isCreator}
        onManageClick={onManageClick}
        patronCount={patronCount}
      />

      {/* Only show the main content when the overview tab is selected */}
      {activeTab === "overview" && (
        <>
          {/* Total Raised Section */}
          <div className="mb-6">
            <h2 className="text-gray-400 mb-2">Total Raised</h2>
            <div className="text-5xl font-bold mb-2">
              ${displayRaisedAmount}
            </div>
            <div className="flex items-center">
              <span className="text-xl text-gray-400">Funded {fundedDate}</span>
            </div>
            {/* Don't show any cap messages if the pool is executing */}
            {!isExecuting && (
              <div className="text-sm text-gray-400 mt-1">
                {new Date(pool.ends_at) < new Date() ? (
                  // Pool has ended - show past tense message
                  <>
                    Commitments no longer accepted after{" "}
                    <span className="text-[#836EF9] font-medium">
                      {new Date(pool.ends_at).toLocaleDateString()}
                    </span>
                  </>
                ) : (
                  // Pool still active - show standard message
                  <>
                    Commitments are{" "}
                    {!pool.cap_amount ||
                    pool.cap_amount === 0 ||
                    String(pool.cap_amount) === MAX_SAFE_VALUE
                      ? "uncapped"
                      : `capped at $${displayCapAmount}`}{" "}
                    and accepted until{" "}
                    <span className="text-[#836EF9] font-medium">
                      {new Date(pool.ends_at).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar with Overfunding Message */}
          <div className="relative w-full h-4 bg-gray-800 rounded-full mb-6">
            <div
              className="h-full rounded-full bg-[#836EF9]"
              style={{
                width: `${Math.min(
                  100,
                  (fromUSDCBaseUnits(BigInt(raisedAmount)) /
                    fromUSDCBaseUnits(BigInt(pool.target_amount))) *
                    100
                )}%`,
              }}
            ></div>
            {/* Only show "Overfunded" message for pools with a significant cap */}
            {pool.cap_amount !== undefined &&
              pool.cap_amount > 0.1 &&
              pool.cap_amount !== 0 &&
              targetExceedsCap && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-sm text-[#836EF9] font-medium">
                  Overfunded! Cap reached at{" "}
                  <span className="font-bold">${displayCapAmount}</span>
                </div>
              )}
          </div>

          {/* Pool Funds Section */}
          {renderPoolFunds()}

          {/* User's Commitment */}
          {renderUserCommitment()}
        </>
      )}
    </>
  );
}
