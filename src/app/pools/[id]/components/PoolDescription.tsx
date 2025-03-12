"use client";

import { Pool } from "../../../../lib/supabase";

interface PoolDescriptionProps {
  pool: Pool | null;
}

export default function PoolDescription({ pool }: PoolDescriptionProps) {
  if (!pool || !pool.description) return null;

  return (
    <div className="mt-6 p-4 bg-[#1A1625] rounded-lg">
      <h3 className="text-xl font-semibold mb-4">About Pool</h3>
      <div className="p-4 rounded-lg bg-[#2A2640]">
        <p className="text-white whitespace-pre-wrap">{pool.description}</p>
      </div>
    </div>
  );
}
