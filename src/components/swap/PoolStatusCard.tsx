import React from "react";
import {
  ArrowsRightLeftIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

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

interface PoolStatusCardProps {
  poolExists: boolean | undefined;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  displayRatio?: string | null;
  isLoading?: boolean;
}

export function PoolStatusCard({
  poolExists,
  tokenASymbol,
  tokenBSymbol,
  displayRatio,
  isLoading = false,
}: PoolStatusCardProps) {
  // Show loading state when poolExists is undefined or explicitly loading
  if (poolExists === undefined || isLoading) {
    return (
      <div className="mb-4 p-4 rounded-lg bg-gray-900/30 text-gray-400 border border-gray-800/50 animate-pulse">
        <div className="flex items-center">
          <div className="w-5 h-5 mr-2 bg-gray-700 rounded-full"></div>
          <div>
            <div className="h-5 w-32 bg-gray-700 rounded mb-2"></div>
            <div className="h-4 w-64 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Format the display ratio using our formatter for better readability
  const formattedRatio = displayRatio
    ? formatTokenAmount(parseFloat(displayRatio), 6)
    : null;

  // Calculate the inverse ratio
  const inverseRatio =
    displayRatio && parseFloat(displayRatio) > 0
      ? formatTokenAmount(1 / parseFloat(displayRatio), 6)
      : null;

  return (
    <div
      className={`mb-4 p-4 rounded-lg ${
        poolExists
          ? "bg-blue-900/30 text-blue-400 border border-blue-800/50"
          : "bg-yellow-900/30 text-yellow-400 border border-yellow-800/50"
      }`}
    >
      {poolExists ? (
        <div className="flex items-start">
          <InformationCircleIcon className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <div className="w-full">
            <span className="font-medium text-lg">Existing Pool</span>
            <p className="text-sm mt-1 mb-3">
              Tokens will be added according to the current pool ratio.
            </p>

            {displayRatio && tokenASymbol && tokenBSymbol && (
              <div className="mt-2 p-3 bg-blue-900/40 rounded-lg">
                <div className="text-sm font-medium mb-2 text-white">
                  Current Exchange Rate
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="bg-blue-900/50 rounded-full p-1 mr-2">
                      <span className="text-xs px-2 py-1">1</span>
                    </div>
                    <span className="font-medium">{tokenASymbol}</span>
                  </div>
                  <ArrowsRightLeftIcon className="h-4 w-4 mx-2 text-gray-400" />
                  <div className="flex items-center">
                    <div className="bg-blue-900/50 rounded-full p-1 mr-2">
                      <span className="text-xs px-2 py-1">
                        {formattedRatio}
                      </span>
                    </div>
                    <span className="font-medium">{tokenBSymbol}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-900/50 rounded-full p-1 mr-2">
                      <span className="text-xs px-2 py-1">1</span>
                    </div>
                    <span className="font-medium">{tokenBSymbol}</span>
                  </div>
                  <ArrowsRightLeftIcon className="h-4 w-4 mx-2 text-gray-400" />
                  <div className="flex items-center">
                    <div className="bg-blue-900/50 rounded-full p-1 mr-2">
                      <span className="text-xs px-2 py-1">{inverseRatio}</span>
                    </div>
                    <span className="font-medium">{tokenASymbol}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          <div>
            <span className="font-medium text-lg">New or Empty Pool</span>
            <p className="text-sm mt-1">
              You are creating a new pool or resetting an empty one. Your input
              will set the price ratio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
