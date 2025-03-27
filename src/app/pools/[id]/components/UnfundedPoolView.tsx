"use client";

import { Pool } from "../../../../lib/supabase";
import TabsAndSocial from "./TabsAndSocial";
import { formatCurrency } from "../../../../lib/utils";

type TabType = "overview" | "patrons";

interface UnfundedPoolViewProps {
  pool: Pool;
  renderUserCommitment: () => React.ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  raisedAmount: number;
  targetAmount: number;
}

export default function UnfundedPoolView({
  pool,
  renderUserCommitment,
  activeTab = "overview",
  onTabChange,
  raisedAmount,
  targetAmount,
}: UnfundedPoolViewProps) {
  // Calculate percentage funded for the progress bar
  const percentage =
    targetAmount > 0
      ? Math.min(Math.round((raisedAmount / targetAmount) * 100), 100)
      : 0;

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
          {/* Raising Info - Using style similar to OpenPoolView */}
          <div className="mb-4">
            <div className="text-gray-400 mb-2">
              Funding Failed • Target Not Reached
            </div>
            <div className="flex items-center justify-between">
              <div className="text-5xl font-bold">
                ${targetAmount.toLocaleString()}
              </div>
              <div className="text-xl text-gray-400">
                {percentage.toFixed(1)}% • ${raisedAmount.toLocaleString()}
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
