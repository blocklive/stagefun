import React, { useState, useEffect } from "react";
import { useLiquidityPositions } from "@/hooks/useLiquidityPositions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useStageSwap } from "@/hooks/useStageSwap";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { RemoveLiquidityModal } from "./RemoveLiquidityModal";
import { MyPoolsTable } from "./MyPoolsTable";
import { AllPoolsTable } from "./AllPoolsTable";

export function PositionsInterface() {
  const router = useRouter();
  const { user } = usePrivy();
  const { positions, isLoading, refresh, error } = useLiquidityPositions();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const { smartWalletAddress } = useSmartWallet();

  // State for remove liquidity modal
  const [showRemoveLiquidityModal, setShowRemoveLiquidityModal] =
    useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Get user's positions (positions with LP token balance > 0)
  const userPositions = positions.filter(
    (position) => Number(position.lpTokenBalance) > 0
  );

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

  const calculateTVL = (position: any) => {
    // Simple TVL calculation based on token amounts
    const token0Value = parseFloat(position.reserve0) * 1; // Replace with actual price
    const token1Value = parseFloat(position.reserve1) * 1; // Replace with actual price
    return (token0Value + token1Value).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  };

  const calculateFeeRate = (position: any) => {
    // Placeholder - In a real implementation, you would get fee tier from contract
    return "0.3%";
  };

  const toggleMenu = (pairAddress: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.right - 150 + window.scrollX, // Position menu to the left of the button
    });

    if (activeMenu === pairAddress) {
      setActiveMenu(null);
    } else {
      setActiveMenu(pairAddress);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
    };

    if (activeMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [activeMenu]);

  const handleAddLiquidity = (position: any, event: React.MouseEvent) => {
    event.stopPropagation();
    // Navigate to add liquidity page with tokens pre-selected
    router.push(
      `/swap/liquidity?token0=${position.token0.address}&token1=${position.token1.address}`
    );
    setActiveMenu(null);
  };

  const handleRemoveLiquidity = (position: any, event: React.MouseEvent) => {
    event.stopPropagation();
    // Show remove liquidity modal instead of navigating
    setSelectedPosition(position);
    setShowRemoveLiquidityModal(true);
    setActiveMenu(null);
  };

  const handleCloseModal = () => {
    setShowRemoveLiquidityModal(false);
    setSelectedPosition(null);
  };

  const handleRemoveSuccess = () => {
    // Refresh the positions list after successful removal
    setTimeout(() => refresh(), 3000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
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
          {/* Always show My Positions section, even when empty */}
          <MyPoolsTable
            userPositions={userPositions}
            getTokenIconPath={getTokenIconPath}
            formatNumber={formatNumber}
            calculateFeeRate={calculateFeeRate}
            toggleMenu={toggleMenu}
          />

          {/* All Positions Section */}
          <AllPoolsTable
            positions={positions}
            getTokenIconPath={getTokenIconPath}
            formatNumber={formatNumber}
            calculateFeeRate={calculateFeeRate}
            calculateTVL={calculateTVL}
            toggleMenu={toggleMenu}
          />
        </>
      )}

      {/* Portal for dropdown menu - rendered outside the table to avoid overflow issues */}
      {mounted &&
        activeMenu &&
        createPortal(
          <div
            className="fixed py-2 w-48 bg-gray-800 rounded-md shadow-lg z-50 border border-gray-700"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {positions.find((p) => p.pairAddress === activeMenu) && (
              <>
                <button
                  onClick={(e) =>
                    handleAddLiquidity(
                      positions.find((p) => p.pairAddress === activeMenu)!,
                      e
                    )
                  }
                  className="px-4 py-2 text-sm text-white w-full text-left hover:bg-gray-700"
                >
                  Add Liquidity
                </button>
                {Number(
                  positions.find((p) => p.pairAddress === activeMenu)
                    ?.lpTokenBalance
                ) > 0 && (
                  <button
                    onClick={(e) =>
                      handleRemoveLiquidity(
                        positions.find((p) => p.pairAddress === activeMenu)!,
                        e
                      )
                    }
                    className="px-4 py-2 text-sm text-white w-full text-left hover:bg-gray-700"
                  >
                    Remove Liquidity
                  </button>
                )}
              </>
            )}
          </div>,
          document.body
        )}

      {/* Remove Liquidity Modal */}
      {mounted && showRemoveLiquidityModal && selectedPosition && (
        <RemoveLiquidityModal
          position={selectedPosition}
          onClose={handleCloseModal}
          onSuccess={handleRemoveSuccess}
          getTokenIconPath={getTokenIconPath}
          formatNumber={formatNumber}
        />
      )}
    </div>
  );
}
