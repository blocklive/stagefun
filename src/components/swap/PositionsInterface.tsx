import React, { useState } from "react";
import { useLiquidityPositions } from "@/hooks/useLiquidityPositions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";

export function PositionsInterface() {
  const { user } = usePrivy();
  const { positions, isLoading, refresh, error } = useLiquidityPositions();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Format a number with commas for thousands
  const formatNumber = (value: string, decimals: number = 6): string => {
    const num = parseFloat(value);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refresh();
    } catch (e) {
      console.error("Error refreshing positions:", e);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const getTokenIconPath = (symbol: string): string => {
    // Implement your logic to determine the correct icon path based on the token symbol
    // For example, you can use a switch statement or a mapping function
    switch (symbol) {
      case "MON":
        return "/icons/mon-logo.svg";
      case "USDC":
        return "/icons/usdc-logo.svg";
      default:
        return "/icons/unknown-logo.svg";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#1e1e2a] rounded-2xl shadow-md p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Liquidity Positions</h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
          disabled={isLoading || isManualRefreshing}
        >
          {isLoading || isManualRefreshing ? (
            <LoadingSpinner color="#FFFFFF" size={14} />
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      {!user ? (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg">
          <p className="text-gray-400">Connect your wallet to view positions</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner color="#FFFFFF" size={30} />
          <span className="ml-4 text-gray-300">Loading your positions...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-red-900/30 rounded-lg border border-red-800">
          <p className="text-red-400 mb-2">Error loading positions</p>
          <p className="text-sm text-red-300">
            {typeof error === "string" ? error : "An unexpected error occurred"}
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-900 hover:bg-red-800 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg">
          <p className="text-gray-400 mb-2">No liquidity positions found</p>
          <p className="text-sm text-gray-500">Add liquidity to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map((position, index) => (
            <div
              key={position.pairAddress}
              className="bg-gray-800/50 p-4 rounded-xl border border-gray-700"
            >
              {/* Header with token pair and share info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="flex -space-x-2 mr-3">
                    <div className="relative z-10 w-8 h-8 rounded-full overflow-hidden border-2 border-gray-800 bg-white">
                      <Image
                        src={getTokenIconPath(position.token0.symbol)}
                        alt={position.token0.symbol}
                        width={32}
                        height={32}
                        onError={(e) => {
                          // Fallback if token icon isn't found
                          (e.target as HTMLImageElement).src =
                            "/icons/unknown-logo.svg";
                        }}
                      />
                    </div>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-800 bg-white">
                      <Image
                        src={getTokenIconPath(position.token1.symbol)}
                        alt={position.token1.symbol}
                        width={32}
                        height={32}
                        onError={(e) => {
                          // Fallback if token icon isn't found
                          (e.target as HTMLImageElement).src =
                            "/icons/unknown-logo.svg";
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {position.token0.symbol}/{position.token1.symbol}
                    </h3>
                    <p className="text-xs text-gray-400">StageSwap LP</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">Your share</div>
                  <div className="font-medium text-[#836ef9]">
                    {position.shareOfPool}%
                  </div>
                </div>
              </div>

              {/* Pool details */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">
                    Pooled {position.token0.symbol}
                  </div>
                  <div className="font-medium text-lg">
                    {formatNumber(position.tokenAmounts.amount0)}
                  </div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">
                    Pooled {position.token1.symbol}
                  </div>
                  <div className="font-medium text-lg">
                    {formatNumber(position.tokenAmounts.amount1)}
                  </div>
                </div>
              </div>

              {/* Additional pool stats */}
              <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    LP Token Balance
                  </div>
                  <div className="text-sm">
                    {formatNumber(position.lpTokenBalance, 8)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Pool Ratio</div>
                  <div className="text-sm">
                    1 {position.token0.symbol} ={" "}
                    {(
                      parseFloat(position.reserve1) /
                      parseFloat(position.reserve0)
                    ).toFixed(6)}{" "}
                    {position.token1.symbol}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end space-x-2">
                <button
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg"
                  onClick={() => {
                    /* Remove Liquidity functionality will be added later */
                    alert("Remove liquidity functionality coming soon!");
                  }}
                >
                  Remove
                </button>
                <button
                  className="px-4 py-2 text-sm bg-[#836ef9] hover:bg-[#6f5bd0] rounded-lg"
                  onClick={() => {
                    /* Add More Liquidity functionality will be added later */
                    alert("Add more liquidity functionality coming soon!");
                  }}
                >
                  Add More
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
