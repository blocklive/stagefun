"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useLiquidityPositionsOptimized } from "@/hooks/useLiquidityPositionsOptimized";
import { useUserLPPositions } from "@/hooks/useUserLPPositions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { AllPoolsTableOptimized } from "./AllPoolsTableOptimized";
import { LiquidityPosition } from "@/hooks/useLiquidityPositionsOptimized";
import { colors } from "@/lib/theme";
import { FiTrendingUp, FiLayers } from "react-icons/fi";

// Wrap the main content in a Content component with Suspense
function PositionsContentOptimized() {
  const router = useRouter();
  const { user } = usePrivy();
  const { positions, isLoading, refresh, error } =
    useLiquidityPositionsOptimized();
  const {
    positions: userPositions,
    totalValueUsd: userTotalValue,
    isLoading: userPositionsLoading,
    error: userPositionsError,
    refresh: refreshUserPositions,
  } = useUserLPPositions();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refresh();
      refreshUserPositions();
    } catch (e) {
      console.error("Error refreshing positions:", e);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const toggleMenu = (pairAddress: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (activeMenu === pairAddress) {
      setActiveMenu(null);
    } else {
      setActiveMenu(pairAddress);
    }
  };

  // Simple method to close any open menu
  const closeMenu = () => {
    setActiveMenu(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close menu when clicking outside
      if (activeMenu && mounted) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [activeMenu, mounted]);

  const handleAddLiquidity = (
    position: LiquidityPosition,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    // Navigate to add liquidity page with tokens pre-selected
    router.push(
      `/swap/liquidity?token0=${position.token0.address}&token1=${position.token1.address}`
    );
    setActiveMenu(null);
  };

  // Calculate total TVL across all pools
  const totalTVL = positions.reduce((sum, position) => {
    return sum + (position.tvlUsd || 0);
  }, 0);

  const formatTotalTVL = (tvl: number): string => {
    if (tvl >= 1000000) {
      return `$${(tvl / 1000000).toFixed(2)}M`;
    } else if (tvl >= 1000) {
      return `$${(tvl / 1000).toFixed(1)}K`;
    } else {
      return `$${tvl.toFixed(0)}`;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Liquidity Pools</h2>

        {/* Stats boxes */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Total TVL Box */}
          <div className="w-full p-3 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiTrendingUp
                  className="text-lg"
                  style={{ color: colors.purple.DEFAULT }}
                />
                <h3 className="font-bold text-white text-base">Total TVL</h3>
              </div>
              <div
                className="text-xl font-bold font-mono"
                style={{ color: colors.purple.DEFAULT }}
              >
                {formatTotalTVL(totalTVL)}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">Liquidity locked</div>
          </div>

          {/* Total Pools Box */}
          <div className="w-full p-3 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiLayers
                  className="text-lg"
                  style={{ color: colors.purple.DEFAULT }}
                />
                <h3 className="font-bold text-white text-base">Active Pools</h3>
              </div>
              <div
                className="text-xl font-bold font-mono"
                style={{ color: colors.purple.DEFAULT }}
              >
                {positions.length}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">Trading pairs</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full p-8 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14] flex justify-center items-center">
          <LoadingSpinner color={colors.purple.DEFAULT} size={30} />
          <span className="ml-4 text-gray-300">
            Loading pools from database...
          </span>
        </div>
      ) : error ? (
        <div className="w-full p-6 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14] text-center">
          <p className="text-red-400 mb-2">Error loading pools</p>
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
        <div className="w-full p-8 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14] text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-gray-400 mb-2">No liquidity pools found</p>
          <p className="text-sm text-gray-500">
            Pools will appear here once they're created and indexed
          </p>
        </div>
      ) : (
        <>
          {/* My Positions Section */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">My Positions</h3>
            {userPositionsLoading ? (
              <div className="w-full p-6 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14] flex justify-center items-center">
                <LoadingSpinner color={colors.purple.DEFAULT} size={20} />
                <span className="ml-3 text-gray-300">
                  Loading your positions...
                </span>
              </div>
            ) : userPositionsError ? (
              <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14] text-center">
                <p className="text-red-400 text-sm">
                  Error loading your positions
                </p>
              </div>
            ) : userPositions.length === 0 ? (
              <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14] text-center">
                <p className="text-gray-400 mb-3 text-sm">
                  No liquidity positions yet
                </p>
                <button
                  onClick={() => router.push("/swap/liquidity")}
                  className="px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Add Liquidity
                </button>
              </div>
            ) : (
              <div className="w-full bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14] overflow-hidden">
                <div className="px-4 py-3 bg-[#FFFFFF14] border-b border-[#FFFFFF14]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {userPositions.length} position
                      {userPositions.length !== 1 ? "s" : ""}
                    </span>
                    <span
                      className="text-sm font-medium font-mono"
                      style={{ color: colors.purple.DEFAULT }}
                    >
                      $
                      {userTotalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-[#FFFFFF14]">
                  {userPositions.map((position, index) => (
                    <div
                      key={position.lpTokenAddress}
                      className="px-4 py-4 hover:bg-[#FFFFFF0A]"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="text-white font-medium">
                            {position.token0Symbol}/{position.token1Symbol}
                          </div>
                          <div className="text-sm text-gray-400">
                            {position.shareOfPool.toFixed(4)}% of pool
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="font-medium font-mono"
                            style={{ color: colors.purple.DEFAULT }}
                          >
                            $
                            {position.userPositionValueUsd.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {position.lpTokenBalanceFormatted} LP tokens
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 flex gap-4">
                        <span>
                          {position.userReserve0.toFixed(6)}{" "}
                          {position.token0Symbol}
                        </span>
                        <span>
                          {position.userReserve1.toFixed(6)}{" "}
                          {position.token1Symbol}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* All Pools Section */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">All Pools</h3>
            <AllPoolsTableOptimized
              positions={positions}
              toggleMenu={toggleMenu}
              activeMenu={activeMenu}
              onAddLiquidity={handleAddLiquidity}
              closeMenu={closeMenu}
            />
          </div>
        </>
      )}
    </div>
  );
}

// Export main component which wraps content in Suspense
export function PositionsInterfaceOptimized() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-6xl mx-auto">
          <div className="w-full p-8 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14] flex justify-center items-center">
            <LoadingSpinner color={colors.purple.DEFAULT} size={30} />
            <span className="ml-4 text-gray-300">Loading positions...</span>
          </div>
        </div>
      }
    >
      <PositionsContentOptimized />
    </Suspense>
  );
}
