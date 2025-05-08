import React from "react";

// Adding formatTokenAmount function based on WalletAssets.tsx
const formatTokenAmount = (quantity: number, decimals: number = 4): string => {
  // For very small numbers, use scientific notation below a certain threshold
  if (quantity > 0 && quantity < 0.000001) {
    return quantity.toExponential(6);
  }

  // Otherwise use regular formatting with appropriate decimals
  const maxDecimals = Math.min(decimals, 6);

  return quantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

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

  // Format the display ratio for better readability
  const formattedRatio = formatTokenAmount(parseFloat(displayRatio), 6);

  return (
    <div className="mb-4 text-sm text-center text-gray-400">
      <span>
        Pool Ratio: 1 {tokenASymbol} = {formattedRatio} {tokenBSymbol}
      </span>
    </div>
  );
}
