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

type TabType = "overview" | "patrons";

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
}: FundedPoolViewProps) {
  const fundedDate = targetReachedTimestamp
    ? new Date(targetReachedTimestamp * 1000).toLocaleDateString()
    : new Date(pool.ends_at).toLocaleDateString();

  // Check if pool is in executing status
  const isExecuting =
    getPoolStatusFromNumber(pool.blockchain_status) === PoolStatus.EXECUTING;

  // Get cap amount display for UI
  const displayCapAmount = useMemo(() => {
    if (!pool.cap_amount) return "";

    // If cap amount is already in display form (decimal)
    if (pool.cap_amount < 1000) {
      return pool.cap_amount.toLocaleString();
    }
    // If it's in base units
    else {
      try {
        return fromUSDCBaseUnits(
          BigInt(Math.floor(pool.cap_amount))
        ).toLocaleString();
      } catch (e) {
        console.error("Error formatting cap amount:", e);
        return pool.cap_amount.toString();
      }
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
    if (!pool || !pool.tiers) return 0;

    // Count total commitments across all tiers
    return (pool.tiers as any[]).reduce((total: number, tier: any) => {
      return total + (tier.commitments?.length || 0);
    }, 0);
  }, [pool]);

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
                Commitments are{" "}
                {!pool.cap_amount
                  ? "uncapped"
                  : `capped at $${displayCapAmount}`}{" "}
                and accepted until{" "}
                <span className="text-[#836EF9] font-medium">
                  {new Date(pool.ends_at).toLocaleDateString()}
                </span>
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
