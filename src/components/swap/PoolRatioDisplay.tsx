import React from "react";

interface PoolRatioDisplayProps {
  poolExists: boolean;
  tokenASymbol: string;
  tokenBSymbol: string;
  displayRatio: string | null;
}

export function PoolRatioDisplay({
  poolExists,
  tokenASymbol,
  tokenBSymbol,
  displayRatio,
}: PoolRatioDisplayProps) {
  if (!poolExists || !displayRatio) return null;

  return (
    <div className="mb-4 text-sm text-center text-gray-400">
      <span>
        Pool Ratio: 1 {tokenASymbol} = {displayRatio} {tokenBSymbol}
      </span>
    </div>
  );
}
