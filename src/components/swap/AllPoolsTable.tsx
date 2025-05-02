import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaSortDown } from "react-icons/fa";
import { BsThreeDots } from "react-icons/bs";

interface AllPoolsTableProps {
  positions: any[];
  getTokenIconPath: (symbol: string) => string;
  formatNumber: (value: string, decimals?: number) => string;
  calculateFeeRate: (position: any) => string;
  calculateTVL: (position: any) => string;
  toggleMenu: (pairAddress: string, event: React.MouseEvent) => void;
}

export const AllPoolsTable: React.FC<AllPoolsTableProps> = ({
  positions,
  getTokenIconPath,
  formatNumber,
  calculateFeeRate,
  calculateTVL,
  toggleMenu,
}) => {
  // Helper function to check if a pool is empty (no reserves)
  const isEmptyPool = (position: any) => {
    const reserve0Value = parseFloat(position.reserve0);
    const reserve1Value = parseFloat(position.reserve1);
    return (
      position.isEmpty ||
      ((reserve0Value === 0 || reserve0Value < 0.0001) &&
        (reserve1Value === 0 || reserve1Value < 0.0001))
    );
  };

  return (
    <div>
      <h3 className="text-xl font-medium text-white mb-4">All Pools</h3>
      <div className="bg-[#1e1e2a] rounded-xl overflow-x-auto">
        <table className="w-full text-left text-white min-w-[900px]">
          <thead className="bg-[#15161a] border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium text-gray-400">#</th>
              <th className="p-4 font-medium text-gray-400">Pool</th>
              <th className="p-4 font-medium text-gray-400">Status</th>
              <th className="p-4 font-medium text-gray-400">Fee tier</th>
              <th className="p-4 font-medium text-gray-400 flex items-center">
                TVL <FaSortDown className="ml-1" />
              </th>
              <th className="p-4 font-medium text-gray-400">Balance</th>
              <th className="p-4 font-medium text-gray-400">Pool ratio</th>
              <th className="p-4 font-medium text-gray-400">Your LP tokens</th>
              <th className="p-4 font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position, index) => (
              <tr
                key={position.pairAddress}
                className={`border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer ${
                  isEmptyPool(position) ? "opacity-70" : ""
                }`}
                onClick={() =>
                  (window.location.href = `/swap/positions/${position.pairAddress}`)
                }
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
                  {isEmptyPool(position) ? (
                    <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                      Empty
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded bg-green-900/40 text-green-400">
                      Active
                    </span>
                  )}
                </td>
                <td className="p-4 text-gray-300">
                  {calculateFeeRate(position)}
                </td>
                <td className="p-4 font-medium">{calculateTVL(position)}</td>
                <td className="p-4 text-gray-300">
                  {formatNumber(position.reserve0, 4)} {position.token0.symbol}{" "}
                  / {formatNumber(position.reserve1, 4)}{" "}
                  {position.token1.symbol}
                </td>
                <td className="p-4 text-gray-300">
                  {isEmptyPool(position) ? (
                    <span className="text-gray-500">-</span>
                  ) : (
                    <>
                      1 {position.token0.symbol} ={" "}
                      {(
                        parseFloat(position.reserve1) /
                        parseFloat(position.reserve0)
                      ).toFixed(6)}{" "}
                      {position.token1.symbol}
                    </>
                  )}
                </td>
                <td className="p-4 text-gray-300">
                  {Number(position.lpTokenBalance) > 0 ? (
                    formatNumber(position.lpTokenBalance, 8)
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="p-4">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
