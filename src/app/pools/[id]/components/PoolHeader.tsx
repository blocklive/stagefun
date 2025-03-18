"use client";

import Image from "next/image";
import { Pool } from "../../../../lib/supabase";

export interface PoolHeaderProps {
  pool: Pool;
  isFunded: boolean;
  isUnfunded?: boolean;
  isCreator?: boolean;
  handleEditClick?: () => void;
}

export default function PoolHeader({
  pool,
  isFunded,
  isUnfunded,
  isCreator,
  handleEditClick,
}: PoolHeaderProps) {
  // Determine the status text and color
  let statusText = "Accepting patrons";
  let statusColor = "#836EF9"; // Purple for default/accepting patrons

  if (isFunded) {
    statusText = "Funded";
    statusColor = "#A78BFA"; // Purple for funded
  } else if (isUnfunded) {
    statusText = "Unfunded";
    statusColor = "#F87171"; // Red for unfunded
  } else if (pool.blockchain_status === "pending") {
    statusText = "Pending";
  } else if (
    pool.status === "inactive" &&
    pool.blockchain_status !== "active" &&
    pool.blockchain_status !== "confirmed"
  ) {
    // Only show inactive if the pool is truly inactive (not active on blockchain)
    statusText = "Inactive";
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
      <div className="flex items-center gap-4">
        {/* Pool Image */}
        <div className="relative w-12 h-12 rounded-[16px] overflow-hidden bg-gray-700 flex-shrink-0">
          {pool.image_url ? (
            <Image
              src={pool.image_url}
              alt={pool.name}
              fill
              className="object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white"
              style={{ backgroundColor: "#836EF9" }}
            >
              <span className="text-xl font-bold">{pool.name.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Pool Title and Status */}
        <div className="flex-1">
          <div className="flex flex-col">
            {/* Status indicator above title */}
            <div
              className="text-sm font-medium mb-1 flex items-center"
              style={{ color: statusColor }}
            >
              <span
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: statusColor }}
              ></span>
              {statusText}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold">{pool?.name}</h1>
          </div>
        </div>
      </div>

      {/* Edit Button - Only show if user is the creator */}
      {isCreator && (
        <button
          onClick={handleEditClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF14] rounded-[16px] text-white hover:bg-opacity-80 transition-all"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
          <span>Manage</span>
        </button>
      )}
    </div>
  );
}
