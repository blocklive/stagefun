"use client";

import React from "react";
import { Asset } from "@/lib/zerion/ZerionSDK";
import { useWalletAssetsAdapter } from "@/hooks/useWalletAssetsAdapter";
import { TokenIcon } from "@/components/token/TokenIcon";
import AssetsSkeleton from "./AssetsSkeleton";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Official token addresses for verification
const OFFICIAL_USDC_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase();
const OFFICIAL_WMON_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.officialWmon.toLowerCase();

interface BalanceSectionProps {
  walletAddress: string | null;
  chainId?: string;
  isOwnProfile?: boolean;
  onSendClick: (asset: Asset, e: React.MouseEvent) => void;
}

export default function BalanceSection({
  walletAddress,
  chainId = "monad-test-v2",
  isOwnProfile = true,
  onSendClick,
}: BalanceSectionProps) {
  // Use our adapter to get the assets
  const { assets, totalValue, isLoading, error, refresh, source } =
    useWalletAssetsAdapter(walletAddress, chainId, {
      useZerion: false, // Only use Alchemy by default
      combineData: false,
    });

  const formatCurrency = (value: number | null): string => {
    if (value === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Function to detect if an asset is the native currency
  const isNativeCurrency = (asset: Asset): boolean => {
    // Check if it's the base asset for the Monad chain
    return (
      asset.id === "base-monad-test-v2-asset-asset" ||
      (asset.attributes.fungible_info?.symbol === "MON" &&
        asset.attributes.fungible_info?.implementations?.[0]?.address === null)
    );
  };

  // Custom priority ordering for specific tokens (similar to WalletAssets.tsx)
  const getPriorityOrder = (asset: Asset): number => {
    const symbol = asset.attributes.fungible_info?.symbol;
    const tokenAddress =
      asset.attributes.fungible_info?.implementations?.[0]?.address?.toLowerCase();
    const isNative = isNativeCurrency(asset);

    // Priority order:
    // 0: MON first
    // 1: USDC second (with correct address)
    // 2: WMON third (with correct address)
    // 100: Regular tokens
    if (isNative || symbol === "MON") return 0;
    if (symbol === "USDC" && tokenAddress === OFFICIAL_USDC_ADDRESS) return 1;
    if (symbol === "WMON" && tokenAddress === OFFICIAL_WMON_ADDRESS) return 2;
    return 100; // Any other token
  };

  // Show loading skeleton instead of spinner
  if (isLoading && assets.length === 0) {
    return <AssetsSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-4">
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
    <div className="space-y-4 mt-6">
      {/* Asset List */}
      <div className="space-y-4">
        {assets.length > 0 ? (
          assets
            .sort((a, b) => {
              const priorityA = getPriorityOrder(a);
              const priorityB = getPriorityOrder(b);

              // If tokens have different priorities, sort by priority
              if (priorityA !== priorityB) {
                return priorityA - priorityB;
              }

              // If same priority, sort by quantity (highest first)
              return (
                (b.attributes.quantity?.float || 0) -
                (a.attributes.quantity?.float || 0)
              );
            })
            .map((asset) => {
              const tokenSymbol = asset.attributes.fungible_info?.symbol || "";
              const tokenName =
                asset.attributes.fungible_info?.name || "Unknown Token";
              const balance = asset.attributes.quantity?.float || 0;
              const formattedBalance = balance.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: balance < 0.001 ? 8 : 6,
              });
              const tokenLogo = asset.attributes.fungible_info?.icon?.url || "";
              const address =
                asset.attributes.fungible_info?.implementations?.[0]?.address?.toLowerCase() ||
                null;

              // Check if this is a verified or pinned token
              const isNative = isNativeCurrency(asset);
              const isVerified = asset.attributes.isVerified;
              const isPinned =
                isNative ||
                address === OFFICIAL_USDC_ADDRESS ||
                address === OFFICIAL_WMON_ADDRESS;

              return (
                <div
                  key={asset.id}
                  className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4"
                >
                  <div className="flex items-center">
                    <TokenIcon
                      symbol={tokenSymbol}
                      logoURI={tokenLogo}
                      address={address}
                      size="lg"
                    />
                    <div className="ml-4 flex-1">
                      <h3 className="font-bold flex items-center">
                        {tokenName}
                        {(isVerified || isPinned) && (
                          <span
                            className="inline-block h-2 w-2 ml-1.5 bg-[#836EF9] opacity-70 rounded-full"
                            aria-label="Verified token"
                          ></span>
                        )}
                      </h3>
                      <div className="flex items-center text-sm">
                        <span className="text-gray-400">
                          {formattedBalance} {tokenSymbol}
                        </span>
                      </div>
                    </div>
                    {isOwnProfile && (
                      <button
                        onClick={(e) => onSendClick(asset, e)}
                        className="px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-white text-sm transition-colors"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              );
            })
        ) : (
          <div className="text-center py-8 text-gray-400">
            No assets found in this wallet.
          </div>
        )}
      </div>
    </div>
  );
}
