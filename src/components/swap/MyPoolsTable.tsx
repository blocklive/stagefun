import React from "react";
import Image from "next/image";
import { BsThreeDots } from "react-icons/bs";
import Link from "next/link";

interface MyPoolsTableProps {
  userPositions: any[];
  getTokenIconPath: (symbol: string) => string;
  formatNumber: (value: string, decimals?: number) => string;
  calculateFeeRate: (position: any) => string;
  toggleMenu: (pairAddress: string, event: React.MouseEvent) => void;
}

export const MyPoolsTable: React.FC<MyPoolsTableProps> = ({
  userPositions,
  getTokenIconPath,
  formatNumber,
  calculateFeeRate,
  toggleMenu,
}) => {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-medium text-white mb-4">My Positions</h3>

      {userPositions.length === 0 ? (
        <div className="bg-[#1e1e2a] rounded-xl p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <Image
              src="/icons/empty-pool.svg"
              alt="No liquidity positions"
              width={80}
              height={80}
              onError={(e) => {
                // Fallback if icon isn't found
                (e.target as HTMLImageElement).src = "/icons/unknown-logo.svg";
              }}
              className="mb-4 opacity-70"
            />
            <h4 className="text-lg font-medium text-white mb-2">
              No Liquidity Positions
            </h4>
            <p className="text-gray-400 mb-6 max-w-md">
              You don't have any liquidity positions yet. Add liquidity to start
              earning fees.
            </p>
            <Link
              href="/swap/liquidity"
              className="px-6 py-3 bg-gradient-to-r from-[#9b6dff] to-[#836ef9] text-white hover:from-[#a57cff] hover:to-[#8f7dff] border border-[#b89fff]/30 shadow-lg shadow-purple-900/20 rounded-lg font-medium"
            >
              Add Liquidity
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[#1e1e2a] rounded-xl overflow-x-auto">
          <table className="w-full text-left text-white min-w-[900px]">
            <thead className="bg-[#15161a] border-b border-gray-800">
              <tr>
                <th className="p-4 font-medium text-gray-400">#</th>
                <th className="p-4 font-medium text-gray-400">Pool</th>
                <th className="p-4 font-medium text-gray-400">Fee tier</th>
                <th className="p-4 font-medium text-gray-400">Balance</th>
                <th className="p-4 font-medium text-gray-400">Your balance</th>
                <th className="p-4 font-medium text-gray-400">Pool ratio</th>
                <th className="p-4 font-medium text-gray-400">
                  Your LP tokens
                </th>
                <th className="p-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userPositions.map((position, index) => (
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
                  <td className="p-4 text-gray-300">
                    {formatNumber(position.reserve0, 4)}{" "}
                    {position.token0.symbol} /{" "}
                    {formatNumber(position.reserve1, 4)}{" "}
                    {position.token1.symbol}
                  </td>
                  <td className="p-4 text-gray-300">
                    {formatNumber(position.tokenAmounts.amount0, 4)} /{" "}
                    {formatNumber(position.tokenAmounts.amount1, 4)}
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
                    {formatNumber(position.lpTokenBalance, 8)}
                  </td>
                  <td className="p-4">
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
    </div>
  );
};
