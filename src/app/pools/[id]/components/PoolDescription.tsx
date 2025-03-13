"use client";

import { Pool } from "../../../../lib/supabase";

interface PoolDescriptionProps {
  pool: Pool | null;
}

export default function PoolDescription({ pool }: PoolDescriptionProps) {
  if (!pool || !pool.description) return null;

  return (
    <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
      <h3 className="text-xl font-semibold mb-4">About Pool</h3>
      <div className="p-4 rounded-[12px] bg-[#FFFFFF0F]">
        <p className="text-white whitespace-pre-wrap">{pool.description}</p>
      </div>
    </div>
  );
}
