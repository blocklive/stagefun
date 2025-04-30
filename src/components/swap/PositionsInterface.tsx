import React, { useState, useRef, useEffect } from "react";
import { useLiquidityPositions } from "@/hooks/useLiquidityPositions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { FaSortDown } from "react-icons/fa";
import { BsThreeDots } from "react-icons/bs";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

export function PositionsInterface() {
  const router = useRouter();
  const { user } = usePrivy();
  const { positions, isLoading, refresh, error } = useLiquidityPositions();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
    // For now, navigate to the same liquidity page
    router.push(
      `/swap/liquidity?token0=${position.token0.address}&token1=${position.token1.address}`
    );
    setActiveMenu(null);
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
      ) : positions.length === 0 ? (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg">
          <p className="text-gray-400 mb-2">No liquidity pools found</p>
          <p className="text-sm text-gray-500">Be the first to add liquidity</p>
        </div>
      ) : (
        <div className="bg-[#1e1e2a] rounded-xl overflow-x-auto">
          <table className="w-full text-left text-white min-w-[900px]">
            <thead className="bg-[#15161a] border-b border-gray-800">
              <tr>
                <th className="p-4 font-medium text-gray-400">#</th>
                <th className="p-4 font-medium text-gray-400">Pool</th>
                <th className="p-4 font-medium text-gray-400">Fee tier</th>
                <th className="p-4 font-medium text-gray-400 flex items-center">
                  TVL <FaSortDown className="ml-1" />
                </th>
                <th className="p-4 font-medium text-gray-400">Your balance</th>
                <th className="p-4 font-medium text-gray-400">Pool ratio</th>
                <th className="p-4 font-medium text-gray-400">
                  Your LP tokens
                </th>
                <th className="p-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => (
                <tr
                  key={position.pairAddress}
                  className="border-b border-gray-800 hover:bg-gray-800/30"
                >
                  <td className="p-4 text-gray-300">{index + 1}</td>
                  <td className="p-4">
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
                      <span className="font-medium">
                        {position.token0.symbol}/{position.token1.symbol}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">
                    {calculateFeeRate(position)}
                  </td>
                  <td className="p-4 font-medium">{calculateTVL(position)}</td>
                  <td className="p-4 text-gray-300">
                    {Number(position.tokenAmounts.amount0) > 0 ? (
                      <>
                        {formatNumber(position.tokenAmounts.amount0, 4)} /{" "}
                        {formatNumber(position.tokenAmounts.amount1, 4)}
                      </>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-300">
                    1 {position.token0.symbol} ={" "}
                    {(
                      parseFloat(position.reserve1) /
                      parseFloat(position.reserve0)
                    ).toFixed(6)}{" "}
                    {position.token1.symbol}
                  </td>
                  <td className="p-4 text-gray-300">
                    {Number(position.lpTokenBalance) > 0 ? (
                      formatNumber(position.lpTokenBalance, 8)
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-300">
                    <button
                      onClick={(e) => toggleMenu(position.pairAddress, e)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700"
                      aria-label="Pool options"
                    >
                      <BsThreeDots size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                <button
                  onClick={(e) =>
                    handleRemoveLiquidity(
                      positions.find((p) => p.pairAddress === activeMenu)!,
                      e
                    )
                  }
                  className={`px-4 py-2 text-sm w-full text-left hover:bg-gray-700 ${
                    Number(
                      positions.find((p) => p.pairAddress === activeMenu)!
                        .lpTokenBalance
                    ) > 0
                      ? "text-white"
                      : "text-gray-500 cursor-not-allowed"
                  }`}
                  disabled={
                    Number(
                      positions.find((p) => p.pairAddress === activeMenu)!
                        .lpTokenBalance
                    ) <= 0
                  }
                >
                  Remove Liquidity
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
