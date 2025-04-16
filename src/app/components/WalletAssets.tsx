"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useWalletAssets } from "../../hooks/useWalletAssets";
import { Asset } from "../../lib/zerion/ZerionSDK";
import type { RefObject } from "react";

interface WalletAssetsProps {
  walletAddress: string | null;
  chainId?: string;
  className?: string;
  onSendClick?: (asset: Asset) => void;
  refreshAssetsRef?: RefObject<() => void>;
  hideTitle?: boolean;
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

// Token display name mapping
const TOKEN_DISPLAY_NAMES: Record<string, string> = {
  USDC: "USD Coin",
  // Add more token display name mappings as needed
};

// LP token detection
const LP_TOKEN_SYMBOLS = ["ATXDAOD", "FC"];
const isLPToken = (symbol: string): boolean => {
  return (
    LP_TOKEN_SYMBOLS.includes(symbol) ||
    symbol.endsWith("LP") ||
    symbol.includes("LP Token")
  );
};

const AssetCard: React.FC<{
  asset: Asset;
  onSendClick: (asset: Asset) => void;
}> = ({ asset, onSendClick }) => {
  const { fungible_info: token, quantity, value } = asset.attributes;

  // Get the token decimals for formatting
  const tokenDecimals =
    quantity.decimals || token.implementations?.[0]?.decimals || 6;

  // Check if this is an LP token that should have the multiplier applied for display
  const isLp = isLPToken(token.symbol);

  // Apply the LP token display enhancement for LP tokens (show 1000x more tokens)
  // This is purely visual and doesn't affect actual balances
  const displayQuantity = isLp ? quantity.float * 1000 : quantity.float;

  // Use the actual quantity from the API with correct decimals
  const displayAmount = formatTokenAmount(displayQuantity, tokenDecimals);

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

  // Get a better display name for the token
  const displayName = TOKEN_DISPLAY_NAMES[token.symbol] || token.name;

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
          <h3 className="font-bold">{displayName}</h3>
          <div className="flex items-center text-sm">
            <span className="text-gray-400">
              {displayNumeric || displayAmount} {token.symbol}
            </span>
          </div>
        </div>
        <div className="text-right flex items-center">
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
  refreshAssetsRef,
  hideTitle = false,
}: WalletAssetsProps) {
  const { assets, totalValue, isLoading, error, refresh } = useWalletAssets(
    walletAddress,
    chainId
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Expose the refresh function to the parent via the ref
  useEffect(() => {
    if (refreshAssetsRef) {
      refreshAssetsRef.current = refresh;
    }
  }, [refreshAssetsRef, refresh]);

  const handleSendClick = (asset: Asset) => {
    onSendClick(asset);
  };

  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-red-400 mb-2">Failed to load wallet assets</div>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] text-white rounded-full text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Main Title - only show if hideTitle is false */}
      {!hideTitle && (
        <h2 className="text-xl font-semibold mb-4">Your Assets</h2>
      )}

      {/* Balance Row (below title) */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-400">Balance</span> {/* Grayed out label */}
        <div className="text-lg font-medium">{formatCurrency(totalValue)}</div>
      </div>

      {/* Assets List Loading/Content */}
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
