"use client";

import Image from "next/image";
import { Pool } from "../../../../lib/supabase";

export interface PoolHeaderProps {
  pool: Pool;
  isFunded: boolean;
  isUnfunded?: boolean;
}

export default function PoolHeader({
  pool,
  isFunded,
  isUnfunded,
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
  } else if (pool.status === "inactive") {
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
    </div>
  );
}
