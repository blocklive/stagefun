import React from "react";
import Link from "next/link";
import { BsThreeDots } from "react-icons/bs";
import { LiquidityPosition } from "@/hooks/useLiquidityPositionsOptimized";
import { useRouter } from "next/navigation";
import { TokenIcon } from "@/components/token/TokenIcon";

interface AllPoolsTableOptimizedProps {
  positions: LiquidityPosition[];
  toggleMenu: (pairAddress: string, event: React.MouseEvent) => void;
  activeMenu: string | null;
  onAddLiquidity: (
    position: LiquidityPosition,
    event: React.MouseEvent
  ) => void;
  closeMenu: () => void;
}

export const AllPoolsTableOptimized: React.FC<AllPoolsTableOptimizedProps> = ({
  positions,
  toggleMenu,
  activeMenu,
  onAddLiquidity,
  closeMenu,
}) => {
  const router = useRouter();

  const handleRowClick = (pairAddress: string) => {
    router.push(`/swap/positions/${pairAddress}`);
  };

  // Determine if a row is in the top half of the table
  const isTopHalf = (index: number) => {
    return index < positions.length / 2;
  };

  // Format TVL for display
  const formatTVL = (tvlUsd?: number): string => {
    // Handle undefined, null, 0, -0, and NaN
    if (!tvlUsd || tvlUsd === 0 || Object.is(tvlUsd, -0) || isNaN(tvlUsd)) {
      return "-";
    }

    // Only show positive TVL values
    const absoluteTVL = Math.abs(tvlUsd);

    if (absoluteTVL >= 1000000) {
      return `$${(absoluteTVL / 1000000).toFixed(1)}M`;
    } else if (absoluteTVL >= 1000) {
      return `$${(absoluteTVL / 1000).toFixed(1)}K`;
    } else {
      return `$${absoluteTVL.toFixed(0)}`;
    }
  };

  // Format reserves for display in tooltip
  const formatReserve = (
    reserve: string,
    symbol: string,
    decimals: number
  ): string => {
    const reserveNum = parseFloat(reserve) / Math.pow(10, decimals);
    return `${reserveNum.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} ${symbol}`;
  };

  return (
    <div>
      <h3 className="text-xl font-medium text-white mb-4">All Pools</h3>
      <div className="bg-[#1e1e2a] rounded-xl overflow-x-auto">
        <table className="w-full text-left text-white min-w-[800px]">
          <thead className="bg-[#15161a] border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium text-gray-400">#</th>
              <th className="p-4 font-medium text-gray-400">Pool</th>
              <th className="p-4 font-medium text-gray-400">TVL</th>
              <th className="p-4 font-medium text-gray-400">Status</th>
              <th className="p-4 font-medium text-gray-400">Fee tier</th>
              <th className="p-4 font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position, index) => (
              <tr
                key={position.pairAddress}
                className="border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer"
                onClick={() => handleRowClick(position.pairAddress)}
              >
                <td className="p-4 text-gray-300">{index + 1}</td>
                <td className="p-4">
                  <div className="flex items-center">
                    <div className="flex -space-x-2 mr-3">
                      <div className="relative z-10 border-2 border-gray-800 rounded-full">
                        <TokenIcon
                          symbol={position.token0.symbol}
                          logoURI={position.token0.logoURI}
                          address={position.token0.address}
                          size="md"
                        />
                      </div>
                      <div className="relative border-2 border-gray-800 rounded-full">
                        <TokenIcon
                          symbol={position.token1.symbol}
                          logoURI={position.token1.logoURI}
                          address={position.token1.address}
                          size="md"
                        />
                      </div>
                    </div>
                    <Link
                      href={`/swap/positions/${position.pairAddress}`}
                      className="font-medium hover:text-purple-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {position.token0.symbol}/{position.token1.symbol}
                    </Link>
                  </div>
                </td>
                <td className="p-4">
                  <div className="relative group">
                    <span className="text-white font-medium">
                      {formatTVL(position.tvlUsd)}
                    </span>
                    {/* Tooltip with reserve details */}
                    {position.tvlUsd && position.tvlUsd > 0 && (
                      <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                        <div>
                          {formatReserve(
                            position.reserve0,
                            position.token0.symbol,
                            position.token0.decimals
                          )}
                        </div>
                        <div>
                          {formatReserve(
                            position.reserve1,
                            position.token1.symbol,
                            position.token1.decimals
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Updated:{" "}
                          {position.lastSyncTimestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs rounded bg-green-900/40 text-green-400">
                    Active
                  </span>
                </td>
                <td className="p-4 text-gray-300">0.3%</td>
                <td className="p-4">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(position.pairAddress, e);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700"
                      aria-label="Pool options"
                    >
                      <BsThreeDots size={18} />
                    </button>

                    {/* Adaptive dropdown menu */}
                    {activeMenu === position.pairAddress && (
                      <div
                        className={`absolute ${
                          isTopHalf(index)
                            ? "top-full mt-2" // Open downward for top half
                            : "bottom-full mb-2" // Open upward for bottom half
                        } w-48 rounded-md shadow-xl z-[2000] border border-gray-700 overflow-hidden`}
                        style={{
                          backgroundColor: "#191C27",
                          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.0)",
                          right: "calc(100% + 5px)", // Position to the left of the button
                        }}
                      >
                        <ul className="py-1">
                          <li className="block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddLiquidity(position, e);
                              }}
                              className="block w-full px-4 py-2 text-sm text-white text-left bg-[#191C27] hover:bg-gray-700"
                            >
                              Add Liquidity
                            </button>
                          </li>
                          <li className="block">
                            <Link
                              href={`/swap/positions/${position.pairAddress}`}
                              className="block w-full px-4 py-2 text-sm text-white text-left bg-[#191C27] hover:bg-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeMenu();
                              }}
                            >
                              View Details
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
