"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pool } from "../../../../lib/supabase";
import { getStageDotFunLiquidityContract } from "../../../../lib/contracts/StageDotFunPool";
import { ethers } from "ethers";
import { useContractInteraction } from "../../../../hooks/useContractInteraction";

interface TokenSectionProps {
  pool: Pool;
}

export default function TokenSection({ pool }: TokenSectionProps) {
  const [lpTokenSymbol, setLpTokenSymbol] = useState<string>(
    pool.token_symbol + "-LP"
  );
  const [lpTokenName, setLpTokenName] = useState<string>(
    `${pool.name} LP Token`
  );
  const { getProvider } = useContractInteraction();
  const explorerUrl =
    process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER ||
    "https://testnet.monadexplorer.com";

  useEffect(() => {
    const fetchLpTokenInfo = async () => {
      if (!pool.lp_token_address) return;

      try {
        // Set default values based on pool data (since LP token contract likely has empty name/symbol)
        setLpTokenSymbol(pool.token_symbol ? `${pool.token_symbol}-LP` : "LP");
        setLpTokenName(`${pool.name} LP Token`);

        // Try to get from contract (but will likely be empty due to contract bug)
        const provider = await getProvider();
        const lpTokenContract = getStageDotFunLiquidityContract(
          provider,
          pool.lp_token_address
        );

        // Check if contract returns valid names
        const symbol = await lpTokenContract.symbol();
        const name = await lpTokenContract.name();

        // Only update if we got non-empty values
        if (symbol && symbol.trim() !== "") {
          setLpTokenSymbol(symbol);
        }

        if (name && name.trim() !== "") {
          setLpTokenName(name);
        }
      } catch (error) {
        console.error("Error fetching LP token info:", error);
        // Keep using the default values set above
      }
    };

    fetchLpTokenInfo();
  }, [pool.lp_token_address, pool.name, pool.token_symbol, getProvider]);

  // Check if LP token address exists
  if (!pool.lp_token_address) {
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
            <div>
              <div className="text-2xl font-bold">${pool.token_symbol}</div>
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
      <h3 className="text-xl font-semibold mb-4">Token</h3>
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
            <div className="text-2xl font-bold">${lpTokenSymbol}</div>
            <div className="text-sm text-gray-400">{lpTokenName}</div>
          </div>
        </div>
      </Link>
    </div>
  );
}
