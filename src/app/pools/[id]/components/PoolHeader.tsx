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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{pool?.name}</h1>
              {isFunded && (
                <span className="text-sm text-purple-400 flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
                  • Funded
                </span>
              )}
              {isUnfunded && (
                <span className="text-sm text-red-400 flex items-center">
                  <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
                  • Unfunded
                </span>
              )}
            </div>
            <div
              className="text-sm font-medium mb-1"
              style={{ color: "#836EF9" }}
            >
              {pool.blockchain_status === "active" ||
              pool.blockchain_status === "confirmed"
                ? "Accepting patrons"
                : pool.blockchain_status === "pending"
                ? "Pending"
                : pool.status || "Inactive"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
