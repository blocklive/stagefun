import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TransformedPool } from "../../../hooks/useUserFundedPools";
import { useClaimRefund } from "../../../hooks/useClaimRefund";
import { Asset } from "../../../lib/zerion/ZerionSDK";
import showToast from "../../../utils/toast";

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
      await handleClaimRefund(poolAddress, () => {
        // Refresh pools and assets after successful claim
        if (onRefresh) {
          onRefresh();
        }
      });
    } catch (error) {
      console.error("Error claiming refund:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
          style={{ borderColor: "#836EF9" }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>Error loading pools. Please try again.</p>
        {isUsingCache && (
          <p className="text-sm mt-1">Using cached data if available.</p>
        )}
      </div>
    );
  }

  if (pools.length === 0) {
    return <div className="text-center py-8 text-gray-400">{emptyMessage}</div>;
  }

  // Group pools by status
  const raisingPools = pools.filter((pool) => pool.status === "ACTIVE");
  const fundedPools = pools.filter((pool) =>
    ["FUNDED", "FULLY_FUNDED"].includes(pool.status)
  );
  const productionPools = pools.filter((pool) => pool.status === "EXECUTING");
  const unfundedPools = pools.filter((pool) =>
    ["FAILED", "CANCELLED"].includes(pool.status)
  );

  // Build a structure for each group
  const poolGroups = [
    { title: "Raising", pools: raisingPools, className: "border-[#00C48C]" },
    { title: "Funded", pools: fundedPools, className: "border-[#836EF9]" },
    {
      title: "Production",
      pools: productionPools,
      className: "border-[#22C55E]",
    },
    { title: "Unfunded", pools: unfundedPools, className: "border-[#F87171]" },
  ].filter((group) => group.pools.length > 0);

  // Render the pools in groups
  return (
    <div className="space-y-6">
      {poolGroups.map((group) => (
        <div key={group.title} className="space-y-4">
          {poolGroups.length > 1 && (
            <h3
              className={`text-lg font-semibold pl-4 border-l-4 ${group.className}`}
            >
              {group.title}
            </h3>
          )}
          <div className="space-y-4">
            {group.pools.map((pool) => (
              <div
                key={pool.id}
                className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4"
                onClick={() => router.push(`/pools/${pool.id}`)}
              >
                <div className="flex items-center">
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
                  <div className="ml-4 flex-1">
                    <h3 className="font-bold">{pool.name}</h3>
                    <div className="flex items-center text-sm">
                      <span className={`text-gray-400 flex items-center`}>
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-1 ${
                            getPoolStatus(pool).colorClass
                          }`}
                        ></span>
                        {getPoolStatus(pool).text}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex items-center">
                    {/* Show Claim Refund button for unfunded pools if user has matching tokens */}
                    {getPoolStatus(pool).text === "Unfunded" &&
                      isOwnProfile &&
                      poolsWithUserTokens.has(pool.contract_address) && (
                        <button
                          onClick={(e) =>
                            onClaimRefund(pool.contract_address, e)
                          }
                          disabled={isRefunding}
                          className={`px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-white text-sm transition-colors mr-4 ${
                            isRefunding ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {isRefunding ? "Claiming..." : "Claim Refund"}
                        </button>
                      )}

                    {pool.commitment_amount && (
                      <span className="text-purple-400 font-semibold">
                        {pool.commitment_amount.toFixed(2)} USDC
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
