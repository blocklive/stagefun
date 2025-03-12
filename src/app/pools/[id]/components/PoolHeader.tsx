"use client";

import Image from "next/image";
import { Pool } from "../../../../lib/supabase";

interface PoolHeaderProps {
  pool: Pool;
  isTrading: boolean;
}

export default function PoolHeader({ pool, isTrading }: PoolHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        {/* Pool Image */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
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
            <div
              className="text-sm font-medium mb-1"
              style={{ color: "#836EF9" }}
            >
              {isTrading
                ? "• Actively trading"
                : pool.blockchain_status === "active" ||
                  pool.blockchain_status === "confirmed"
                ? "Accepting patrons"
                : pool.blockchain_status === "pending"
                ? "Pending"
                : pool.status || "Inactive"}
            </div>
            <h1 className="text-3xl font-bold">{pool.name}</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
