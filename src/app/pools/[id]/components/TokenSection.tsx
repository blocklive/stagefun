"use client";

import Link from "next/link";
import { Pool } from "../../../../lib/supabase";
import { useLpTokenInfo } from "../../../../hooks/useLpTokenInfo";

interface TokenSectionProps {
  pool: Pool;
}

export default function TokenSection({ pool }: TokenSectionProps) {
  const {
    symbol: lpTokenSymbol,
    name: lpTokenName,
    isLoading,
  } = useLpTokenInfo(pool.lp_token_address, pool.name, pool.ticker);

  const explorerUrl =
    process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER ||
    "https://testnet.monadexplorer.com";

  // Generate a fallback name for UI display if needed
  const fallbackSymbol = `${pool.name.substring(0, 4).toUpperCase()}-LP`;
  const fallbackName = `${pool.name} Liquidity Token`;

  // Check if LP token address exists
  if (!pool.lp_token_address) {
    return (
      <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
        <h3 className="text-xl font-semibold mb-4">LP Token</h3>
        <div className="p-4 rounded-[12px] bg-[#FFFFFF0F]">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#836EF9" }}
            >
              <span className="text-2xl">🎭</span>
            </div>
            <div>
              <div className="text-2xl font-bold">{fallbackSymbol}</div>
              <div className="text-sm text-gray-400">
                Pool token not deployed yet
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
      <h3 className="text-xl font-semibold mb-4">LP Token</h3>
      <Link
        href={`${explorerUrl}/address/${pool.lp_token_address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 rounded-[12px] bg-[#FFFFFF0F] hover:bg-[#FFFFFF14] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#836EF9" }}
          >
            <span className="text-2xl">🎭</span>
          </div>
          <div>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-6 w-20 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-40 bg-gray-700 rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {lpTokenSymbol || fallbackSymbol}
                </div>
                <div className="text-sm text-gray-400">
                  {lpTokenName || fallbackName}
                </div>
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
