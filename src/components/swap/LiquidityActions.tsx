import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddLiquidityForm } from "./AddLiquidityForm";
import { RemoveLiquidityForm } from "./RemoveLiquidityForm";
import { TokenSelector } from "./TokenSelector";
import { useTokenList } from "@/hooks/useTokenList";
import { Token } from "@/types/token";

export function LiquidityActions() {
  // Use token list hook with onlyWithLiquidity = false to allow adding liquidity to any token
  const { allTokens, isLoading: isTokensLoading } = useTokenList({
    onlyWithLiquidity: false,
  });

  const [activeTab, setActiveTab] = useState("add");
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);

  // Initialize tokens when allTokens are loaded
  useEffect(() => {
    if (allTokens.length > 0 && !tokenA && !tokenB) {
      // Find USDC and MON from loaded tokens (default pair)
      const usdc = allTokens.find((t) => t.symbol === "USDC");
      const mon = allTokens.find((t) => t.symbol === "MON");

      if (usdc) setTokenA(usdc);
      if (mon) setTokenB(mon);
    }
  }, [allTokens, tokenA, tokenB]);

  // Swap token positions
  const handleSwapTokens = () => {
    if (!tokenA || !tokenB) return;
    setTokenA(tokenB);
    setTokenB(tokenA);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#1e1e2a] rounded-2xl shadow-md p-6 text-white">
      <Tabs defaultValue="add" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="add">Add Liquidity</TabsTrigger>
          <TabsTrigger value="remove">Remove Liquidity</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-2">
          {isTokensLoading ? (
            <div className="text-center py-8 text-gray-400">
              Loading tokens...
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Token A
                  </label>
                </div>
                <TokenSelector
                  selectedToken={tokenA}
                  onTokenSelect={setTokenA}
                  excludeAddresses={
                    tokenB ? [tokenB.address.toLowerCase()] : []
                  }
                  title="Select Token A"
                />
              </div>

              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Token B
                  </label>
                </div>
                <TokenSelector
                  selectedToken={tokenB}
                  onTokenSelect={setTokenB}
                  excludeAddresses={
                    tokenA ? [tokenA.address.toLowerCase()] : []
                  }
                  title="Select Token B"
                />
              </div>

              {tokenA && tokenB ? (
                <AddLiquidityForm
                  tokenA={tokenA}
                  tokenB={tokenB}
                  onSwapTokens={handleSwapTokens}
                />
              ) : (
                <div className="text-center py-4 text-gray-400">
                  Select both tokens to add liquidity
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="remove" className="mt-2">
          <RemoveLiquidityForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
