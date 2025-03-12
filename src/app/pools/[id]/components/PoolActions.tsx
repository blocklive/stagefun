"use client";

import { Pool, User } from "../../../../lib/supabase";

interface PoolActionsProps {
  pool: Pool;
  dbUser: User | null;
  usdcBalance: string;
  commitAmount: string;
  isApproving: boolean;
  handleMaxClick: () => void;
  handleCommit: () => Promise<void>;
  setCommitAmount: (value: string) => void;
}

export default function PoolActions({
  pool,
  dbUser,
  usdcBalance,
  commitAmount,
  isApproving,
  handleMaxClick,
  handleCommit,
  setCommitAmount,
}: PoolActionsProps) {
  return (
    <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Your Balance:</span>
          <span className="font-medium">
            {usdcBalance} {pool.currency}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={commitAmount}
            onChange={(e) => setCommitAmount(e.target.value)}
            min={pool.min_commitment || 1}
            step="1"
            className="flex-1 py-2 px-4 rounded-lg bg-[#1A1625] text-white border border-gray-700 focus:outline-none focus:border-blue-500"
            placeholder={`Min: ${pool.min_commitment || 1}`}
          />
          <button
            onClick={handleMaxClick}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Max
          </button>
        </div>
        <button
          onClick={handleCommit}
          disabled={isApproving}
          className={`w-full py-3 px-4 rounded-lg font-medium text-lg ${
            isApproving
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-[#4F46E5] text-white hover:bg-[#4338CA]"
          }`}
        >
          {isApproving ? "Processing..." : "Commit"}
        </button>
      </div>
    </div>
  );
}
