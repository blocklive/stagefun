"use client";

import { useState } from "react";
import { Pool } from "../../../../lib/supabase";
import { formatCurrency } from "../../../../lib/utils";
import TabsAndSocial from "./TabsAndSocial";
import { fromUSDCBaseUnits } from "../../../../lib/contracts/StageDotFunPool";
import CountdownTimer from "../../../components/CountdownTimer";
import React from "react";

type TabType = "overview" | "patrons";

interface OpenPoolViewProps {
  pool: Pool;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  targetAmount: number;
  raisedAmount: number;
  percentage: number;
  renderUserCommitment: () => React.ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  isCreator?: boolean;
  onManageClick?: () => void;
}

export default function OpenPoolView({
  pool,
  days,
  hours,
  minutes,
  seconds,
  targetAmount,
  raisedAmount,
  percentage,
  renderUserCommitment,
  activeTab = "overview",
  onTabChange,
  isCreator = false,
  onManageClick,
}: OpenPoolViewProps) {
  // Calculate the number of patrons
  const patronCount = React.useMemo(() => {
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
          {/* Raising and Time Info */}
          <div className="mb-4">
            <div className="text-gray-400 mb-2">
              Raising • Ends in {days} days
            </div>
            <div className="flex items-center justify-between">
              <div className="text-5xl font-bold">
                ${fromUSDCBaseUnits(BigInt(targetAmount)).toLocaleString()}
              </div>
              <div className="text-xl text-gray-400">
                {percentage.toFixed(1)}% • $
                {fromUSDCBaseUnits(BigInt(raisedAmount)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-4 bg-gray-800 rounded-full mb-6">
            <div
              className="h-full rounded-full bg-[#836EF9]"
              style={{
                width: `${Math.min(percentage, 100)}%`,
              }}
            ></div>
          </div>

          {/* Time Left - Using the responsive CountdownTimer component */}
          <CountdownTimer
            days={days}
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            className="mb-6"
          />

          {/* User's Commitment */}
          {renderUserCommitment()}
        </>
      )}
    </>
  );
}
