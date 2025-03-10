"use client";

import { Pool } from "../../../../lib/supabase";
import TabsAndSocial from "./TabsAndSocial";
import { formatCurrency } from "../../../../lib/utils";

type TabType = "overview" | "tokenHolders" | "patrons";

interface TradingPoolViewProps {
  pool: Pool;
  renderUserCommitment: () => React.ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  raisedAmount: number;
}

export default function TradingPoolView({
  pool,
  renderUserCommitment,
  activeTab = "overview",
  onTabChange,
  raisedAmount,
}: TradingPoolViewProps) {
  return (
    <>
      {/* Tabs and Social Icons */}
      <TabsAndSocial activeTab={activeTab} onTabChange={onTabChange} />

      {/* Total Raised Section */}
      <div className="mb-6">
        <h2 className="text-gray-400 mb-2">Total Raised</h2>
        <div className="text-5xl font-bold mb-2">
          {formatCurrency(raisedAmount)}
        </div>
        <div className="flex items-center">
          <span className="text-xl text-gray-400">
            Funded {new Date(pool.ends_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* User's Commitment */}
      {renderUserCommitment()}
    </>
  );
}
