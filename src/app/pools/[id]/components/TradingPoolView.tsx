"use client";

import { Pool } from "../../../../lib/supabase";
import TabsAndSocial from "./TabsAndSocial";
import { formatCurrency } from "../../../../lib/utils";
import { useMemo } from "react";
import { fromUSDCBaseUnits } from "../../../../lib/contracts/StageDotFunPool";

type TabType = "overview" | "patrons";

interface TradingPoolViewProps {
  pool: Pool;
  renderUserCommitment: () => React.ReactNode;
  renderPoolFunds: () => React.ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  raisedAmount: number | string | bigint;
}

export default function TradingPoolView({
  pool,
  renderUserCommitment,
  renderPoolFunds,
  activeTab = "overview",
  onTabChange,
  raisedAmount,
}: TradingPoolViewProps) {
  // Format raised amount
  const displayRaisedAmount = useMemo(() => {
    if (!raisedAmount) return "$0";

    try {
      // Assume raisedAmount is in base units and convert to BigInt
      const raisedAmountBigInt = BigInt(raisedAmount);

      // Simple conversion from base units to human readable
      return formatCurrency(fromUSDCBaseUnits(raisedAmountBigInt));
    } catch (e) {
      console.error("Error converting raised amount:", e, raisedAmount);
      return "$0";
    }
  }, [raisedAmount]);

  return (
    <>
      {/* Tabs and Social Links */}
      <TabsAndSocial
        activeTab={activeTab}
        onTabChange={onTabChange}
        pool={pool}
      />

      {/* Only show the main content when the overview tab is selected */}
      {activeTab === "overview" && (
        <>
          {/* Total Raised Section */}
          <div className="mb-6">
            <h2 className="text-gray-400 mb-2">Total Raised</h2>
            <div className="text-5xl font-bold mb-2">{displayRaisedAmount}</div>
            <div className="flex items-center">
              <span className="text-xl text-gray-400">
                Funded {new Date(pool.ends_at).toLocaleDateString()}
              </span>
            </div>
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
