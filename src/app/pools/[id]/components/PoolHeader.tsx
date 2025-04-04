"use client";

import Image from "next/image";
import { Pool } from "../../../../lib/supabase";
import {
  PoolStatus,
  getDisplayStatus,
  getPoolStatusFromNumber,
} from "../../../../lib/contracts/types";
import UserAvatar from "@/app/components/UserAvatar";

export interface PoolHeaderProps {
  pool: Pool;
  isCreator?: boolean;
  handleEditClick?: () => void;
}

export default function PoolHeader({
  pool,
  isCreator,
  handleEditClick,
}: PoolHeaderProps) {
  // Get the display status that takes into account end time
  const displayStatus = getDisplayStatus(
    pool.status,
    pool.ends_at,
    pool.raised_amount,
    pool.target_amount
  );

  // Determine the status text and color based on display status
  let statusText = "Accepting patrons";
  let statusColor = "#836EF9"; // Purple for default/accepting patrons

  switch (displayStatus) {
    case "FUNDED":
      statusText = "Funded";
      statusColor = "#A78BFA"; // Purple for funded
      break;
    case "FAILED":
      statusText = "Unfunded";
      statusColor = "#F87171"; // Red for unfunded
      break;
    case "EXECUTING":
      statusText = "Production";
      statusColor = "#22C55E"; // Green for executing
      break;
    case "INACTIVE":
      statusText = "Inactive";
      break;
    case "PAUSED":
      statusText = "Paused";
      break;
    case "CLOSED":
      statusText = "Closed";
      break;
    case "ACTIVE":
    default:
      // Keep default "Accepting patrons" for active pools
      break;
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
      <div className="flex items-center gap-4">
        {/* Pool Image */}
        <div className="relative w-12 h-12 flex-shrink-0">
          {pool.image_url ? (
            <Image
              src={pool.image_url}
              alt={pool.name}
              fill
              className="object-cover rounded-[16px]"
            />
          ) : (
            <UserAvatar name={pool.name} size={48} className="rounded-[16px]" />
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
