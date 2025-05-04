"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiquidityPositions } from "@/hooks/useLiquidityPositions";
import { usePositionDetails } from "@/hooks/usePositionDetails";
import { useSyncPool } from "@/hooks/useSyncPool";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePrivy } from "@privy-io/react-auth";
import { GoLinkExternal } from "react-icons/go";
import { RemoveLiquidityModal } from "@/components/swap/RemoveLiquidityModal";

export default function PositionDetailsPage() {
  const { pair } = useParams();
  const router = useRouter();
  const { user } = usePrivy();
  const { positions } = useLiquidityPositions();
  const {
    positionDetails,
    isLoading: isLoadingDetails,
    refresh: refreshDetails,
    error: detailsError,
  } = usePositionDetails(pair as string);
  const { syncPool, isSyncing } = useSyncPool(pair as string);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isRemoveLiquidityModalOpen, setIsRemoveLiquidityModalOpen] =
    useState(false);

  // Format a number with commas for thousands
  const formatNumber = (value: string, decimals: number = 6): string => {
    if (!value) return "0.00";
    const num = parseFloat(value);
    return isNaN(num)
      ? "0.00"
      : num.toLocaleString(undefined, {
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
      await refreshDetails();
    } catch (e) {
      console.error("Error refreshing position:", e);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleSync = async () => {
    await syncPool();
    // Refresh data after sync
    setTimeout(() => refreshDetails(), 3000);
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

  if (isLoadingDetails || isManualRefreshing) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner color="#FFFFFF" size={30} />
          <span className="ml-4 text-gray-300">Loading pool details...</span>
        </div>
      </div>
    );
  }

  if (!positionDetails) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center py-8 bg-red-900/30 rounded-lg border border-red-800">
          <p className="text-red-400 mb-2">
            Pool not found or error loading details
          </p>
          {detailsError && (
            <p className="text-red-300 mb-4">
              {typeof detailsError === "string"
                ? detailsError
                : "An unexpected error occurred"}
            </p>
          )}
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
                  src={getTokenIconPath(positionDetails.token0.symbol)}
                  alt={positionDetails.token0.symbol}
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
                  src={getTokenIconPath(positionDetails.token1.symbol)}
                  alt={positionDetails.token1.symbol}
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
              {positionDetails.token0.symbol}/{positionDetails.token1.symbol}{" "}
              Pool
            </h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white"
              disabled={isLoadingDetails || isManualRefreshing}
            >
              {isLoadingDetails || isManualRefreshing ? (
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
                  {positionDetails.pairAddress.substring(0, 10)}...
                  {positionDetails.pairAddress.substring(
                    positionDetails.pairAddress.length - 8
                  )}
                </p>
                <Link
                  href={`https://testnet.monadexplorer.com/address/${positionDetails.pairAddress}`}
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
                {formatNumber(positionDetails.reserve0, 4)}{" "}
                {positionDetails.token0.symbol} /{" "}
                {formatNumber(positionDetails.reserve1, 4)}{" "}
                {positionDetails.token1.symbol}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Exchange Rate</p>
              <p className="text-white">
                1 {positionDetails.token0.symbol} ={" "}
                {parseFloat(positionDetails.reserve0) > 0
                  ? (
                      parseFloat(positionDetails.reserve1) /
                      parseFloat(positionDetails.reserve0)
                    ).toFixed(6)
                  : "0.00"}{" "}
                {positionDetails.token1.symbol}
              </p>
              <p className="text-white">
                1 {positionDetails.token1.symbol} ={" "}
                {parseFloat(positionDetails.reserve1) > 0
                  ? (
                      parseFloat(positionDetails.reserve0) /
                      parseFloat(positionDetails.reserve1)
                    ).toFixed(6)
                  : "0.00"}{" "}
                {positionDetails.token0.symbol}
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
                {formatNumber(positionDetails.lpTokenBalance, 8)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Your Liquidity</p>
              <p className="text-white">
                {formatNumber(positionDetails.tokenAmounts.amount0, 4)}{" "}
                {positionDetails.token0.symbol} /{" "}
                {formatNumber(positionDetails.tokenAmounts.amount1, 4)}{" "}
                {positionDetails.token1.symbol}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Share of Pool</p>
              <p className="text-white">
                {positionDetails.shareOfPool
                  ? positionDetails.shareOfPool
                  : "0.00"}
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
                  src={getTokenIconPath(positionDetails.token0.symbol)}
                  alt={positionDetails.token0.symbol}
                  width={32}
                  height={32}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/icons/unknown-logo.svg";
                  }}
                />
              </div>
              <h3 className="text-lg font-medium text-white">
                {positionDetails.token0.symbol}
              </h3>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Token Address</p>
              <div className="flex items-center">
                <p className="text-white font-mono">
                  {positionDetails.token0.address.substring(0, 10)}...
                  {positionDetails.token0.address.substring(
                    positionDetails.token0.address.length - 8
                  )}
                </p>
                <Link
                  href={`https://testnet.monadexplorer.com/token/${positionDetails.token0.address}`}
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
              <p className="text-white">
                {formatNumber(positionDetails.reserve0, 6)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-800 bg-white mr-2">
                <Image
                  src={getTokenIconPath(positionDetails.token1.symbol)}
                  alt={positionDetails.token1.symbol}
                  width={32}
                  height={32}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/icons/unknown-logo.svg";
                  }}
                />
              </div>
              <h3 className="text-lg font-medium text-white">
                {positionDetails.token1.symbol}
              </h3>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Token Address</p>
              <div className="flex items-center">
                <p className="text-white font-mono">
                  {positionDetails.token1.address.substring(0, 10)}...
                  {positionDetails.token1.address.substring(
                    positionDetails.token1.address.length - 8
                  )}
                </p>
                <Link
                  href={`https://testnet.monadexplorer.com/token/${positionDetails.token1.address}`}
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
              <p className="text-white">
                {formatNumber(positionDetails.reserve1, 6)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center space-x-4 mt-8">
        <Link
          href={`/swap/liquidity?token0=${positionDetails.token0.address}&token1=${positionDetails.token1.address}`}
          className="px-6 py-3 bg-purple-700 hover:bg-purple-600 rounded-lg text-white font-medium"
        >
          Add Liquidity
        </Link>
        {parseFloat(positionDetails.lpTokenBalance) > 0 && (
          <button
            onClick={() => setIsRemoveLiquidityModalOpen(true)}
            className="px-6 py-3 bg-red-700 hover:bg-red-600 rounded-lg text-white font-medium"
          >
            Remove Liquidity
          </button>
        )}
      </div>

      {/* Remove Liquidity Modal */}
      {isRemoveLiquidityModalOpen && positionDetails && (
        <RemoveLiquidityModal
          position={positionDetails}
          onClose={() => setIsRemoveLiquidityModalOpen(false)}
          onSuccess={() => {
            setIsRemoveLiquidityModalOpen(false);
            refreshDetails();
          }}
          getTokenIconPath={getTokenIconPath}
          formatNumber={formatNumber}
        />
      )}
    </div>
  );
}
