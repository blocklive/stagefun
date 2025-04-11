"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useWalletAssets } from "../../hooks/useWalletAssets";
import { Asset } from "../../lib/zerion/ZerionSDK";

interface WalletAssetsProps {
  walletAddress: string | null;
  chainId?: string;
  className?: string;
  onSendClick?: (asset: Asset) => void;
}

const formatCurrency = (value: number | null): string => {
  if (value === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatTokenAmount = (quantity: number, decimals: number = 4): string => {
  // For very small numbers, use scientific notation below a certain threshold
  if (quantity > 0 && quantity < 0.000001) {
    return quantity.toExponential(6);
  }

  // Otherwise use regular formatting with appropriate decimals
  const maxDecimals = Math.min(decimals, 6);

  return quantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

// Known token icons map
const TOKEN_ICONS: Record<string, string> = {
  USDC: "/icons/usdc-logo.svg",
  // Add more tokens as needed
};

const AssetCard: React.FC<{
  asset: Asset;
  onSendClick: (asset: Asset) => void;
}> = ({ asset, onSendClick }) => {
  const { fungible_info: token, quantity, value } = asset.attributes;

  // Get the token decimals for formatting
  const tokenDecimals =
    quantity.decimals || token.implementations?.[0]?.decimals || 6;

  // Use the actual quantity from the API with correct decimals
  const displayAmount = formatTokenAmount(quantity.float, tokenDecimals);

  // If the asset's raw numeric string is available, use it for very small amounts
  const displayNumeric =
    quantity.numeric && quantity.float < 0.000001 ? quantity.numeric : null;

  // Use the actual USD value if available, otherwise calculate from quantity
  // For very small values, just show a minimal amount
  const actualValue =
    value !== null
      ? value
      : quantity.float > 0
      ? Math.max(0.01, quantity.float)
      : 0;
  const displayValue = `$${actualValue.toFixed(2)}`;

  // Updated component with styling to match PoolList
  return (
    <div className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4">
      <div className="flex items-center">
        <div
          className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: "#2A2640" }}
        >
          {TOKEN_ICONS[token.symbol] ? (
            <Image
              src={TOKEN_ICONS[token.symbol]}
              alt={token.symbol}
              width={48}
              height={48}
              className="object-contain"
            />
          ) : token.icon?.url ? (
            <Image
              src={token.icon.url}
              alt={token.symbol}
              width={48}
              height={48}
              className="object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              {token.symbol.length > 3
                ? `${token.symbol.slice(0, 3)}`
                : token.symbol}
            </div>
          )}
        </div>
        <div className="ml-4 flex-1">
          <h3 className="font-bold">{token.name}</h3>
          <div className="flex items-center text-sm">
            <span className="text-gray-400">
              {displayNumeric || displayAmount} {token.symbol}
            </span>
          </div>
        </div>
        <div className="text-right flex items-center">
          <span className="text-purple-400 font-semibold mr-4">
            {displayValue}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendClick(asset);
            }}
            className="px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-white text-sm transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default function WalletAssets({
  walletAddress,
  chainId = "monad-test-v2",
  className = "",
  onSendClick = () => {},
}: WalletAssetsProps) {
  const { assets, totalValue, isLoading, error, refresh } = useWalletAssets(
    walletAddress,
    chainId
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleSendClick = (asset: Asset) => {
    onSendClick(asset);
  };

  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-red-400 mb-2">Failed to load wallet assets</div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] text-white rounded-full text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Assets</h2>
        <div className="flex items-center">
          <div className="mr-4 text-lg font-medium">
            {formatCurrency(totalValue)}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="p-2 text-gray-400 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${
                (isLoading || isRefreshing) && "animate-spin"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {isLoading && assets.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#836EF9]"></div>
        </div>
      ) : assets.length > 0 ? (
        <div className="space-y-4">
          {assets
            // Sort by quantity (highest first)
            .sort(
              (a, b) =>
                (b.attributes.quantity?.float || 0) -
                (a.attributes.quantity?.float || 0)
            )
            .map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onSendClick={handleSendClick}
              />
            ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          No assets found in this wallet.
        </div>
      )}
    </div>
  );
}
