"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiquidityPositions } from "@/hooks/useLiquidityPositions";
import { useSyncPool } from "@/hooks/useSyncPool";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePrivy } from "@privy-io/react-auth";
import { GoLinkExternal } from "react-icons/go";

export default function PositionDetailsPage() {
  const { pair } = useParams();
  const router = useRouter();
  const { user } = usePrivy();
  const { positions, isLoading, refresh } = useLiquidityPositions();
  const [position, setPosition] = useState<any>(null);
  const { syncPool, isSyncing } = useSyncPool(pair as string);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && positions.length > 0) {
      const foundPosition = positions.find((pos) => pos.pairAddress === pair);
      if (foundPosition) {
        setPosition(foundPosition);
      }
    }
  }, [pair, positions, isLoading]);

  // Format a number with commas for thousands
  const formatNumber = (value: string, decimals: number = 6): string => {
    const num = parseFloat(value);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  const getTokenIconPath = (symbol: string): string => {
    switch (symbol) {
      case "MON":
        return "/icons/mon-logo.svg";
      case "USDC":
        return "/icons/usdc-logo.svg";
      default:
        return "/icons/unknown-logo.svg";
    }
  };

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refresh();
    } catch (e) {
      console.error("Error refreshing position:", e);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleSync = async () => {
    await syncPool();
    // Refresh data after sync
    setTimeout(() => refresh(), 3000);
  };

  if (!user) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center py-8 bg-gray-800/30 rounded-lg">
          <p className="text-gray-400">
            Connect your wallet to view pool details
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner color="#FFFFFF" size={30} />
          <span className="ml-4 text-gray-300">Loading pool details...</span>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center py-8 bg-red-900/30 rounded-lg border border-red-800">
          <p className="text-red-400 mb-2">Pool not found</p>
          <button
            onClick={() => router.push("/swap/positions")}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white"
          >
            Go back to positions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/swap/positions"
          className="text-purple-400 hover:text-purple-300 mb-4 inline-block"
        >
          ← Back to positions
        </Link>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex -space-x-2 mr-3">
              <div className="relative z-10 w-8 h-8 rounded-full overflow-hidden border-2 border-gray-800 bg-white">
                <Image
                  src={getTokenIconPath(position.token0.symbol)}
                  alt={position.token0.symbol}
                  width={32}
                  height={32}
                  onError={(e) => {
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
                    (e.target as HTMLImageElement).src =
                      "/icons/unknown-logo.svg";
                  }}
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">
              {position.token0.symbol}/{position.token1.symbol} Pool
            </h1>
          </div>
          <div className="flex space-x-2">
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
            <button
              onClick={handleSync}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-sm text-white"
              disabled={isSyncing}
            >
              {isSyncing ? (
                <LoadingSpinner color="#FFFFFF" size={14} />
              ) : (
                "Sync Pool"
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#1e1e2a] rounded-xl p-6">
          <h2 className="text-xl font-medium text-white mb-4">
            Pool Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Pool Address</p>
              <div className="flex items-center">
                <p className="text-white font-mono">
                  {position.pairAddress.substring(0, 10)}...
                  {position.pairAddress.substring(
                    position.pairAddress.length - 8
                  )}
                </p>
                <Link
                  href={`https://testnet.monadexplorer.com/address/${position.pairAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-purple-400 hover:text-purple-300"
                >
                  <GoLinkExternal size={16} />
                </Link>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Fee Tier</p>
              <p className="text-white">0.3%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Value Locked</p>
              <p className="text-white">
                {formatNumber(position.reserve0, 4)} {position.token0.symbol} /{" "}
                {formatNumber(position.reserve1, 4)} {position.token1.symbol}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Exchange Rate</p>
              <p className="text-white">
                1 {position.token0.symbol} ={" "}
                {(
                  parseFloat(position.reserve1) / parseFloat(position.reserve0)
                ).toFixed(6)}{" "}
                {position.token1.symbol}
              </p>
              <p className="text-white">
                1 {position.token1.symbol} ={" "}
                {(
                  parseFloat(position.reserve0) / parseFloat(position.reserve1)
                ).toFixed(6)}{" "}
                {position.token0.symbol}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#1e1e2a] rounded-xl p-6">
          <h2 className="text-xl font-medium text-white mb-4">Your Position</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Your LP Tokens</p>
              <p className="text-white">
                {formatNumber(position.lpTokenBalance, 8)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Your Liquidity</p>
              <p className="text-white">
                {formatNumber(position.tokenAmounts.amount0, 4)}{" "}
                {position.token0.symbol} /{" "}
                {formatNumber(position.tokenAmounts.amount1, 4)}{" "}
                {position.token1.symbol}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Share of Pool</p>
              <p className="text-white">
                {(
                  (parseFloat(position.lpTokenBalance) /
                    parseFloat(position.totalSupply)) *
                  100
                ).toFixed(4)}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1e1e2a] rounded-xl p-6">
        <h2 className="text-xl font-medium text-white mb-4">
          Token Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-800 bg-white mr-2">
                <Image
                  src={getTokenIconPath(position.token0.symbol)}
                  alt={position.token0.symbol}
                  width={32}
                  height={32}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/icons/unknown-logo.svg";
                  }}
                />
              </div>
              <h3 className="text-lg font-medium text-white">
                {position.token0.symbol}
              </h3>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Token Address</p>
              <div className="flex items-center">
                <p className="text-white font-mono">
                  {position.token0.address.substring(0, 10)}...
                  {position.token0.address.substring(
                    position.token0.address.length - 8
                  )}
                </p>
                <Link
                  href={`https://testnet.monadexplorer.com/token/${position.token0.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-purple-400 hover:text-purple-300"
                >
                  <GoLinkExternal size={16} />
                </Link>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Reserve</p>
              <p className="text-white">{formatNumber(position.reserve0, 6)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-800 bg-white mr-2">
                <Image
                  src={getTokenIconPath(position.token1.symbol)}
                  alt={position.token1.symbol}
                  width={32}
                  height={32}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/icons/unknown-logo.svg";
                  }}
                />
              </div>
              <h3 className="text-lg font-medium text-white">
                {position.token1.symbol}
              </h3>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Token Address</p>
              <div className="flex items-center">
                <p className="text-white font-mono">
                  {position.token1.address.substring(0, 10)}...
                  {position.token1.address.substring(
                    position.token1.address.length - 8
                  )}
                </p>
                <Link
                  href={`https://testnet.monadexplorer.com/token/${position.token1.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-purple-400 hover:text-purple-300"
                >
                  <GoLinkExternal size={16} />
                </Link>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Reserve</p>
              <p className="text-white">{formatNumber(position.reserve1, 6)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center space-x-4 mt-8">
        <Link
          href={`/swap/liquidity?token0=${position.token0.address}&token1=${position.token1.address}`}
          className="px-6 py-3 bg-purple-700 hover:bg-purple-600 rounded-lg text-white font-medium"
        >
          Add Liquidity
        </Link>
        {Number(position.lpTokenBalance) > 0 && (
          <Link
            href="/swap/positions"
            className="px-6 py-3 bg-red-700 hover:bg-red-600 rounded-lg text-white font-medium"
          >
            Remove Liquidity
          </Link>
        )}
      </div>
    </div>
  );
}
