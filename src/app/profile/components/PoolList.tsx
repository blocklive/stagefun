"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TransformedPool } from "../../../hooks/useUserFundedPools";
import { useClaimRefund } from "../../../hooks/useClaimRefund";
import { Asset } from "../../../lib/zerion/ZerionSDK";
import showToast from "../../../utils/toast";
import PoolListSkeleton from "./PoolListSkeleton";

interface PoolListProps {
  pools: TransformedPool[];
  isLoading: boolean;
  error: Error | null;
  isUsingCache?: boolean;
  emptyMessage: string;
  getPoolStatus: (pool: TransformedPool) => {
    text: string;
    colorClass: string;
  };
  isOwnProfile?: boolean;
  profileName?: string;
  userAssets?: Asset[];
  onRefresh?: () => void;
}

export default function PoolList({
  pools,
  isLoading,
  error,
  isUsingCache = false,
  emptyMessage,
  getPoolStatus,
  isOwnProfile = true,
  profileName = "User",
  userAssets = [],
  onRefresh,
}: PoolListProps) {
  const router = useRouter();
  const { handleClaimRefund, isRefunding } = useClaimRefund();
  const [activeTab, setActiveTab] = useState<
    "Raising" | "Funded" | "Production" | "Unfunded"
  >("Raising");
  // Track which pool is currently being refunded
  const [refundingPool, setRefundingPool] = useState<string | null>(null);

  // Map to store which pools the user has LP tokens for
  const poolsWithUserTokens = new Map<string, Asset>();

  // Match tokens to pools by contract address
  if (isOwnProfile && userAssets.length > 0) {
    // For each unfunded pool
    pools.forEach((pool) => {
      if (getPoolStatus(pool).text !== "Unfunded") return;

      // Get the token addresses for all user assets
      userAssets.forEach((asset) => {
        const tokenAddress =
          asset.attributes.fungible_info?.implementations?.[0]?.address?.toLowerCase();
        if (!tokenAddress) return;

        // Match the token to the pool by LP token address
        if (tokenAddress === pool.lp_token_address?.toLowerCase()) {
          poolsWithUserTokens.set(pool.contract_address, asset);
        }
      });
    });
  }

  // Handle claiming refund
  const onClaimRefund = async (poolAddress: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to pool page

    if (isRefunding) {
      showToast.info("A refund is already being processed");
      return;
    }

    try {
      // Set the current pool being refunded
      setRefundingPool(poolAddress);

      await handleClaimRefund(poolAddress, () => {
        // Refresh pools and assets after successful claim
        if (onRefresh) {
          onRefresh();
        }
      });
    } catch (error) {
      console.error("Error claiming refund:", error);
    } finally {
      // Clear the refunding pool state
      setRefundingPool(null);
    }
  };

  // Handle loading state with skeleton
  if (isLoading && pools.length === 0) {
    return <PoolListSkeleton />;
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-red-400 mb-2">Failed to load pools.</div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] text-white rounded-full text-sm"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Handle empty state
  if (pools.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Group pools by status
  const raisingPools = pools.filter((pool) => pool.status === "ACTIVE");
  const fundedPools = pools.filter((pool) =>
    ["FUNDED", "FULLY_FUNDED"].includes(pool.status)
  );
  const productionPools = pools.filter((pool) => pool.status === "EXECUTING");
  let unfundedPools = pools.filter((pool) =>
    ["FAILED", "CANCELLED"].includes(pool.status)
  );

  // Sort unfunded pools to show those with available refunds at the top
  if (isOwnProfile && poolsWithUserTokens.size > 0) {
    unfundedPools = unfundedPools.sort((a, b) => {
      const aHasRefund = poolsWithUserTokens.has(a.contract_address);
      const bHasRefund = poolsWithUserTokens.has(b.contract_address);

      if (aHasRefund && !bHasRefund) return -1; // a comes first
      if (!aHasRefund && bHasRefund) return 1; // b comes first
      return 0; // keep original order
    });
  }

  // Define the pool groups with their data
  const poolGroups = {
    Raising: { pools: raisingPools },
    Funded: { pools: fundedPools },
    Production: { pools: productionPools },
    Unfunded: { pools: unfundedPools },
  };

  // Get the available tabs (only show tabs for pool types that exist)
  const availableTabs = Object.entries(poolGroups)
    .filter(([_, group]) => group.pools.length > 0)
    .map(
      ([title]) => title as "Raising" | "Funded" | "Production" | "Unfunded"
    );

  // If no active tab is in available tabs, set the first available tab as active
  if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
    setActiveTab(availableTabs[0]);
  }

  // Get the pools for the active tab
  const activePools = poolGroups[activeTab]?.pools || [];

  // Check if there are refundable tokens for the notification dot
  const hasRefundablePools = isOwnProfile && poolsWithUserTokens.size > 0;

  // Format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Render the pools with tabs
  return (
    <div className="mt-6">
      {/* Status Tabs */}
      {availableTabs.length > 0 && (
        <div className="flex mb-8">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide w-full">
            {availableTabs.map((tabName) => (
              <button
                key={tabName}
                className={`px-4 h-9 rounded-xl text-base font-medium flex-shrink-0 ${
                  activeTab === tabName
                    ? "bg-[#FFFFFF1F] border border-[#FFFFFF29] text-white"
                    : "bg-[#FFFFFF0F] text-gray-400 hover:text-gray-200"
                }`}
                onClick={() => setActiveTab(tabName)}
              >
                <div className="flex items-center">
                  {tabName}
                  {tabName === "Unfunded" && hasRefundablePools && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-orange-500"></span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pool Cards */}
      <div className="space-y-4">
        {activePools.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No {activeTab.toLowerCase()} pools found.
          </div>
        ) : (
          activePools.map((pool) => (
            <div
              key={pool.id}
              className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4"
              onClick={() => {
                // Use slug-based route if available, otherwise fall back to ID
                if (pool.slug) {
                  router.push(`/${pool.slug}`);
                } else {
                  router.push(`/pools/${pool.id}`);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "#2A2640" }}
                  >
                    {pool.image_url ? (
                      <Image
                        src={pool.image_url}
                        alt={pool.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized={true}
                      />
                    ) : null}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-bold">{pool.name}</h3>
                    {pool.commitment_amount && (
                      <div className="text-gray-400 text-sm">
                        ${pool.commitment_amount.toFixed(2)}
                      </div>
                    )}
                    {/* Show raised amount instead for hosted pools */}
                    {!pool.commitment_amount && pool.raised_amount > 0 && (
                      <div className="text-gray-400 text-sm">
                        ${pool.raised_amount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Refund button */}
                {getPoolStatus(pool).text === "Unfunded" &&
                  isOwnProfile &&
                  poolsWithUserTokens.has(pool.contract_address) && (
                    <button
                      onClick={(e) => onClaimRefund(pool.contract_address, e)}
                      disabled={refundingPool !== null}
                      className={`px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-white text-sm transition-colors ${
                        refundingPool === pool.contract_address
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {refundingPool === pool.contract_address
                        ? "Claiming..."
                        : "Refund"}
                    </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
