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
}

export default function UnfundedPoolView({
  pool,
  renderUserCommitment,
  activeTab = "overview",
  onTabChange,
  raisedAmount,
}: UnfundedPoolViewProps) {
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
            <div className="text-5xl font-bold mb-2">
              {formatCurrency(raisedAmount)}
            </div>
            <div className="flex items-center">
              <span className="text-xl text-gray-400">
                Ended {new Date(pool.ends_at).toLocaleDateString()} - Target not
                reached
              </span>
            </div>
          </div>

          {/* User's Commitment - with refund option */}
          {renderUserCommitment()}
        </>
      )}
    </>
  );
}
