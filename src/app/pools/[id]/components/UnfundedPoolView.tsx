"use client";

import { Pool } from "../../../../lib/supabase";
import TabsAndSocial from "./TabsAndSocial";
import { formatCurrency } from "../../../../lib/utils";
import { useMemo } from "react";
import { fromUSDCBaseUnits } from "../../../../lib/contracts/StageDotFunPool";

type TabType = "overview" | "patrons";

interface UnfundedPoolViewProps {
  pool: Pool;
  renderUserCommitment: () => React.ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  raisedAmount: number | string | bigint;
  targetAmount: number;
  isCreator?: boolean;
  onManageClick?: () => void;
}

export default function UnfundedPoolView({
  pool,
  renderUserCommitment,
  activeTab = "overview",
  onTabChange,
  raisedAmount,
  targetAmount,
  isCreator = false,
  onManageClick,
}: UnfundedPoolViewProps) {
  // Format raised and target amounts
  const displayRaisedAmount = useMemo(() => {
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

  const displayTargetAmount = useMemo(() => {
    if (!targetAmount) return "0";
    return fromUSDCBaseUnits(BigInt(targetAmount)).toLocaleString();
  }, [targetAmount]);

  // Calculate percentage funded for the progress bar
  const percentage = useMemo(() => {
    if (!targetAmount || !raisedAmount) return 0;

    try {
      const raisedNum = Number(displayRaisedAmount.replace(/,/g, ""));
      const targetNum = Number(displayTargetAmount.replace(/,/g, ""));

      return targetNum > 0
        ? Math.min(Math.round((raisedNum / targetNum) * 100), 100)
        : 0;
    } catch (e) {
      console.error("Error calculating percentage:", e);
      return 0;
    }
  }, [displayRaisedAmount, displayTargetAmount, raisedAmount, targetAmount]);

  // Calculate the number of patrons
  const patronCount = useMemo(() => {
    if (!pool || !pool.tiers) return 0;

    // Get unique patron addresses across all tiers
    const uniquePatrons = new Set();
    pool.tiers.forEach((tier) => {
      if (tier.commitments) {
        tier.commitments.forEach((commitment) => {
          uniquePatrons.add(commitment.user_address.toLowerCase());
        });
      }
    });

    return uniquePatrons.size;
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
          {/* Raising Info - Using style similar to OpenPoolView */}
          <div className="mb-4">
            <div className="text-gray-400 mb-2">
              Funding Failed • Target Not Reached
            </div>
            <div className="flex items-center justify-between">
              <div className="text-5xl font-bold">${displayTargetAmount}</div>
              <div className="text-xl text-gray-400">
                {percentage.toFixed(1)}% • ${displayRaisedAmount}
              </div>
            </div>
          </div>

          {/* Progress Bar - Red for unfunded */}
          <div className="w-full h-4 bg-gray-800 rounded-full mb-6">
            <div
              className="h-full rounded-full bg-red-500"
              style={{
                width: `${Math.min(percentage, 100)}%`,
              }}
            ></div>
          </div>

          {/* User's Commitment - with refund option */}
          {renderUserCommitment()}
        </>
      )}
    </>
  );
}
