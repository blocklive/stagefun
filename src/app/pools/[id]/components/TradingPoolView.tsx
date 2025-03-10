"use client";

import { Pool } from "../../../../lib/supabase";
import TabsAndSocial from "./TabsAndSocial";

type TabType = "overview" | "tokenHolders" | "patrons";

interface TradingPoolViewProps {
  pool: Pool;
  renderUserCommitment: () => React.ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export default function TradingPoolView({
  pool,
  renderUserCommitment,
  activeTab = "overview",
  onTabChange,
}: TradingPoolViewProps) {
  return (
    <>
      {/* Tabs and Social Icons */}
      <TabsAndSocial activeTab={activeTab} onTabChange={onTabChange} />

      {/* Market Cap Section */}
      <div className="mb-6">
        <h2 className="text-gray-400 mb-2">Market Cap</h2>
        <div className="text-5xl font-bold mb-2">$255,981.89</div>
        <div className="flex items-center">
          <span className="text-xl text-gray-400">$84.4M</span>
          <span className="text-xl text-green-400 ml-2">+54.4%</span>
          <span className="text-xl text-gray-400 ml-2">
            • Expires {new Date(pool.ends_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* User's Commitment */}
      {renderUserCommitment()}
    </>
  );
}
