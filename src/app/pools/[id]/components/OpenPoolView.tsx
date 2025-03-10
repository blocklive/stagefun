"use client";

import { useState } from "react";
import { Pool } from "../../../../lib/supabase";
import TabsAndSocial from "./TabsAndSocial";

type TabType = "overview" | "tokenHolders" | "patrons";

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
}: OpenPoolViewProps) {
  return (
    <>
      {/* Tabs and Social Icons */}
      <TabsAndSocial activeTab={activeTab} onTabChange={onTabChange} />

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
                ${targetAmount.toLocaleString()}
              </div>
              <div className="text-xl text-gray-400">
                {percentage.toFixed(1)}% • ${raisedAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full mb-6">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>

          {/* Time Left */}
          <div className="bg-[#1A1727] p-4 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Time left</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#0F0D1B] p-4 rounded-lg text-center">
                <div className="text-3xl font-bold">{days}</div>
                <div className="text-gray-400">Days</div>
              </div>
              <div className="bg-[#0F0D1B] p-4 rounded-lg text-center">
                <div className="text-3xl font-bold">{hours}</div>
                <div className="text-gray-400">Hours</div>
              </div>
              <div className="bg-[#0F0D1B] p-4 rounded-lg text-center">
                <div className="text-3xl font-bold">{minutes}</div>
                <div className="text-gray-400">Minutes</div>
              </div>
              <div className="bg-[#0F0D1B] p-4 rounded-lg text-center">
                <div className="text-3xl font-bold">{seconds}</div>
                <div className="text-gray-400">Seconds</div>
              </div>
            </div>
          </div>

          {/* User's Commitment */}
          {renderUserCommitment()}
        </>
      )}
    </>
  );
}
