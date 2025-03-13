"use client";

import { useState } from "react";
import { Pool } from "../../../../lib/supabase";
import TabsAndSocial from "./TabsAndSocial";

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
      {/* Tabs and Social Links */}
      <TabsAndSocial
        activeTab={activeTab}
        onTabChange={onTabChange}
        pool={pool}
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
              className="h-full rounded-full"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: "#836EF9",
              }}
            ></div>
          </div>

          {/* Time Left */}
          <div className="bg-[#FFFFFF0A] p-4 rounded-[16px] mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Time left</h2>
              <div className="flex space-x-2">
                <div className="bg-[#FFFFFF0F] px-4 py-2 rounded-[12px] text-center">
                  <div className="text-2xl font-bold">{days}</div>
                </div>
                <div className="text-xl font-bold flex items-center">:</div>
                <div className="bg-[#FFFFFF0F] px-4 py-2 rounded-[12px] text-center">
                  <div className="text-2xl font-bold">{hours}</div>
                </div>
                <div className="text-xl font-bold flex items-center">:</div>
                <div className="bg-[#FFFFFF0F] px-4 py-2 rounded-[12px] text-center">
                  <div className="text-2xl font-bold">{minutes}</div>
                </div>
                <div className="text-xl font-bold flex items-center">:</div>
                <div className="bg-[#FFFFFF0F] px-4 py-2 rounded-[12px] text-center">
                  <div className="text-2xl font-bold">{seconds}</div>
                </div>
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
