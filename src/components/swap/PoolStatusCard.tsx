import React from "react";
import {
  ArrowsRightLeftIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Format token amounts with appropriate precision
const formatTokenAmount = (quantity: number, decimals: number = 4): string => {
  if (quantity > 0 && quantity < 0.000001) {
    return quantity.toExponential(6);
  }

  const maxDecimals = Math.min(decimals, 6);
  return quantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

interface Fee {
  fee: number;
  displayName: string;
  description: string;
}

interface PoolStatusCardProps {
  poolExists: boolean | undefined;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  displayRatio?: string | null;
  isLoading?: boolean;
  fee: Fee;
}

export function PoolStatusCard({
  poolExists,
  tokenASymbol,
  tokenBSymbol,
  displayRatio,
  isLoading = false,
  fee,
}: PoolStatusCardProps) {
  // Show loading state
  if (isLoading || poolExists === undefined) {
    return (
      <div className="mb-4 bg-[#FFFFFF0A] rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="flex items-center mb-2">
            <div className="w-5 h-5 rounded-full bg-gray-700 mr-2"></div>
            <div className="h-5 w-40 bg-gray-700 rounded"></div>
          </div>
          <div className="h-10 w-full bg-gray-700 rounded-lg"></div>
          <div className="h-8 w-full bg-gray-700 rounded-lg"></div>
          <div className="h-4 w-56 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Format display ratio
  const formattedRatio = displayRatio
    ? formatTokenAmount(parseFloat(displayRatio), 6)
    : null;

  // Ensure we display the fee correctly
  const displayFee =
    fee.displayName || (fee.fee > 0 ? `${fee.fee / 100}%` : "0%");

  return (
    <div className="mb-4 bg-[#FFFFFF0A] rounded-lg p-4">
      {poolExists ? (
        <div className="space-y-2">
          {/* Line 1: Existing Pool title with icon */}
          <div className="flex items-center mb-2">
            <InformationCircleIcon className="w-5 h-5 mr-2 text-[#9b6dff]" />
            <span className="font-medium text-lg text-[#9b6dff]">
              Existing Pool
            </span>
          </div>

          {/* Line 2: Exchange rate in single direction */}
          {displayRatio && tokenASymbol && tokenBSymbol && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1B1B1F] rounded-lg">
              <div className="text-white">1 {tokenASymbol}</div>
              <ArrowsRightLeftIcon className="h-4 w-4 mx-4 text-gray-400" />
              <div className="text-white">
                {formattedRatio} {tokenBSymbol}
              </div>
            </div>
          )}

          {/* Line 3: Pool fee on a single line */}
          <div className="px-4 py-2 bg-[#1B1B1F] rounded-lg">
            <div className="flex items-center">
              <span className="mr-1 text-white text-sm">Pool Fee:</span>
              <span className="font-medium text-white text-sm">
                {displayFee}
              </span>
            </div>
          </div>

          {/* Line 4: Message about token addition */}
          <p className="text-gray-400 text-xs">
            Tokens will be added according to the current pool fee and ratio.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* New Pool Header */}
          <div className="flex items-center mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-yellow-400" />
            <span className="font-medium text-lg text-yellow-400">
              New or Empty Pool
            </span>
          </div>

          {/* Fee info */}
          <div className="px-4 py-2 bg-[#1B1B1F] rounded-lg">
            <div className="flex items-center">
              <span className="mr-1 text-white text-sm">Pool Fee:</span>
              <span className="font-medium text-white text-sm">
                {displayFee}
              </span>
            </div>
          </div>

          {/* Message */}
          <p className="text-gray-400 text-xs">
            You are creating a new pool or resetting an empty one. Your input
            will set the price ratio.
          </p>
        </div>
      )}
    </div>
  );
}
