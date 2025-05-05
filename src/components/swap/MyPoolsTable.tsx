import React from "react";
import Image from "next/image";
import { BsThreeDots } from "react-icons/bs";
import Link from "next/link";
import { LiquidityPosition } from "@/hooks/useLiquidityPositions";

interface MyPoolsTableProps {
  userPositions: LiquidityPosition[];
  getTokenIconPath: (symbol: string) => string;
  toggleMenu: (pairAddress: string, event: React.MouseEvent) => void;
}

export const MyPoolsTable: React.FC<MyPoolsTableProps> = ({
  userPositions,
  getTokenIconPath,
  toggleMenu,
}) => {
  // Filter for positions where the user has liquidity
  const positionsWithLiquidity = userPositions.filter(
    (position) => position.hasUserLiquidity
  );

  return (
    <div className="mb-8">
      <h3 className="text-xl font-medium text-white mb-4">My Positions</h3>

      {positionsWithLiquidity.length === 0 ? (
        <div className="bg-[#1e1e2a] rounded-xl p-4 text-center">
          <p className="text-gray-400 mb-2">No liquidity positions found</p>
          <Link
            href="/swap/liquidity"
            className="text-purple-400 hover:text-purple-300 underline text-sm font-medium"
          >
            Add liquidity
          </Link>
        </div>
      ) : (
        <div className="bg-[#1e1e2a] rounded-xl overflow-x-auto">
          <table className="w-full text-left text-white min-w-[600px]">
            <thead className="bg-[#15161a] border-b border-gray-800">
              <tr>
                <th className="p-4 font-medium text-gray-400">#</th>
                <th className="p-4 font-medium text-gray-400">Pool</th>
                <th className="p-4 font-medium text-gray-400">Fee tier</th>
                <th className="p-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positionsWithLiquidity.map((position, index) => (
                <tr
                  key={position.pairAddress}
                  className="border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer"
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
                  <td className="p-4 text-gray-300">0.3%</td>
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
      )}
    </div>
  );
};
