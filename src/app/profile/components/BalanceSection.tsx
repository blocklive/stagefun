"use client";

import React from "react";
import { Asset } from "@/lib/zerion/ZerionSDK";
import { useWalletAssetsAdapter } from "@/hooks/useWalletAssetsAdapter";
import { TokenIcon } from "@/components/token/TokenIcon";
import AssetsSkeleton from "./AssetsSkeleton";

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
              // Sort with priority: MON first, then by value
              const symbolA = a.attributes.fungible_info?.symbol || "";
              const symbolB = b.attributes.fungible_info?.symbol || "";

              // Native MON first
              if (
                symbolA === "MON" &&
                a.attributes.fungible_info?.implementations?.[0]?.address ===
                  null
              )
                return -1;
              if (
                symbolB === "MON" &&
                b.attributes.fungible_info?.implementations?.[0]?.address ===
                  null
              )
                return 1;

              // Then USDC
              if (symbolA === "USDC") return symbolB === "MON" ? 1 : -1;
              if (symbolB === "USDC") return symbolA === "MON" ? -1 : 1;

              // Then by value
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
                asset.attributes.fungible_info?.implementations?.[0]?.address ||
                null;

              return (
                <div
                  key={asset.id}
                  className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4"
                >
                  <div className="flex items-center">
                    <TokenIcon
                      symbol={tokenSymbol}
                      logoURI={tokenLogo}
                      size="lg"
                    />
                    <div className="ml-4 flex-1">
                      <h3 className="font-bold">{tokenName}</h3>
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
