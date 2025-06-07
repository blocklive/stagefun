"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useLiquidityPositionsOptimized } from "@/hooks/useLiquidityPositionsOptimized";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { AllPoolsTableOptimized } from "./AllPoolsTableOptimized";
import { LiquidityPosition } from "@/hooks/useLiquidityPositionsOptimized";

// Wrap the main content in a Content component with Suspense
function PositionsContentOptimized() {
  const router = useRouter();
  const { user } = usePrivy();
  const { positions, isLoading, refresh, error } =
    useLiquidityPositionsOptimized();
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Liquidity Pools</h2>
          {positions.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              Total TVL:{" "}
              <span className="text-white font-medium">
                {formatTotalTVL(totalTVL)}
              </span>
              {" • "}
              {positions.length} pool{positions.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white flex items-center gap-2"
          disabled={isLoading || isManualRefreshing}
        >
          {isLoading || isManualRefreshing ? (
            <LoadingSpinner color="#FFFFFF" size={14} />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner color="#FFFFFF" size={30} />
          <span className="ml-4 text-gray-300">
            Loading pools from database...
          </span>
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-red-900/30 rounded-lg border border-red-800">
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
        <div className="text-center py-12 bg-gray-800/30 rounded-lg">
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
          {/* All Positions Section */}
          <AllPoolsTableOptimized
            positions={positions}
            toggleMenu={toggleMenu}
            activeMenu={activeMenu}
            onAddLiquidity={handleAddLiquidity}
            closeMenu={closeMenu}
          />
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
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner color="#FFFFFF" size={30} />
          <span className="ml-4 text-gray-300">Loading positions...</span>
        </div>
      }
    >
      <PositionsContentOptimized />
    </Suspense>
  );
}
