"use client";

import { Pool } from "../../../../lib/supabase";

interface PoolDetailsProps {
  pool: Pool;
  isTrading: boolean;
}

export default function PoolDetails({ pool, isTrading }: PoolDetailsProps) {
  return (
    <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Pool Details</h3>

      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400">Status:</span>
        <span
          className={`font-medium ${
            isTrading
              ? "text-green-400"
              : pool.blockchain_status === "active" ||
                pool.blockchain_status === "confirmed"
              ? "text-green-400"
              : pool.blockchain_status === "pending"
              ? "text-yellow-400"
              : "text-red-400"
          }`}
        >
          {isTrading
            ? "Trading"
            : pool.blockchain_status === "active" ||
              pool.blockchain_status === "confirmed"
            ? "Active"
            : pool.blockchain_status === "pending"
            ? "Pending"
            : "Inactive"}
        </span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400">Funding Stage:</span>
        <span className="font-medium capitalize">{pool.funding_stage}</span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400">Target Amount:</span>
        <span className="font-medium">
          {pool.target_amount.toLocaleString()} {pool.currency}
        </span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400">Minimum Commitment:</span>
        <span className="font-medium">
          {pool.min_commitment?.toLocaleString() || "0"} {pool.currency}
        </span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400">Raised Amount:</span>
        <span className="font-medium">
          {pool.raised_amount.toLocaleString()} {pool.currency}
        </span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400">Token Amount:</span>
        <span className="font-medium">
          {pool.token_amount} {pool.token_symbol}
        </span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400">Ends At:</span>
        <span className="font-medium">
          {new Date(pool.ends_at).toLocaleDateString()}
        </span>
      </div>

      {pool.location && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Location:</span>
          <span className="font-medium">{pool.location}</span>
        </div>
      )}

      {pool.venue && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Venue:</span>
          <span className="font-medium">{pool.venue}</span>
        </div>
      )}
    </div>
  );
}
