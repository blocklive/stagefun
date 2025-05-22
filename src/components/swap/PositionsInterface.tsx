"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useLiquidityPositions } from "@/hooks/useLiquidityPositions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { AllPoolsTable } from "./AllPoolsTable";
import { LiquidityPosition } from "@/hooks/useLiquidityPositions";

// Wrap the main content in a Content component with Suspense
function PositionsContent() {
  const router = useRouter();
  const { user } = usePrivy();
  const { positions, isLoading, refresh, error } = useLiquidityPositions();
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

  return (
    <div className="w-full max-w-6xl mx-auto pb-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Liquidity Pools</h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white"
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
          <p className="text-gray-400">Connect your wallet to view pools</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner color="#FFFFFF" size={30} />
          <span className="ml-4 text-gray-300">Loading pools...</span>
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
      ) : (
        <>
          {/* All Positions Section */}
          <AllPoolsTable
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
export function PositionsInterface() {
  return (
    <Suspense fallback={<div>Loading positions data...</div>}>
      <PositionsContent />
    </Suspense>
  );
}
