"use client";

import { Pool } from "../../../../lib/supabase";

interface TokenSectionProps {
  pool: Pool;
}

export default function TokenSection({ pool }: TokenSectionProps) {
  return (
    <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
      <h3 className="text-xl font-semibold mb-4">Token</h3>
      <div className="p-4 rounded-[12px] bg-[#FFFFFF0F]">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#836EF9" }}
          >
            <span className="text-2xl">🎭</span>
          </div>
          <div className="text-2xl font-bold">${pool.token_symbol}</div>
        </div>
      </div>
    </div>
  );
}
