"use client";

import Image from "next/image";
import { ethers } from "ethers";
import { useEffect } from "react";
import React from "react";
import UserAvatar from "@/app/components/UserAvatar";
import { Pool } from "@/lib/supabase";
import { useSupabase } from "@/contexts/SupabaseContext";
import { usePrivy } from "@privy-io/react-auth";

interface PatronsTabProps {
  pool: Pool & {
    tiers: {
      id: string;
      name: string;
      commitments: {
        user_address: string;
        amount: number;
        committed_at: string;
        user: {
          id: string;
          name: string;
          avatar_url: string;
        };
      }[];
    }[];
  };
  isLoading: boolean;
  error: any;
  onPatronCountChange?: (count: number) => void;
}

interface DeduplicatedCommitment {
  user_address: string;
  total_amount: number;
  latest_committed_at: string;
  tiers: { tierName: string; tierId: string; count: number }[];
  user: {
    id: string;
    name: string;
    avatar_url: string;
  };
}

export default function PatronsTab({
  pool,
  isLoading,
  error,
  onPatronCountChange,
}: PatronsTabProps) {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();

  // Transform all commitments to deduplicated list with summed amounts
  const deduplicatedCommitments = React.useMemo(() => {
    console.log("Pool tiers in PatronsTab:", pool?.tiers);

    if (!pool?.tiers) {
      console.log("No tiers found in pool data");
      return [];
    }

    // Extract all commitments from all tiers with tier info
    const commitments = pool.tiers.flatMap((tier) => {
      if (!tier) {
        console.log("Found a null/undefined tier");
        return [];
      }

      if (!tier.commitments) {
        console.log(`Tier ${tier.id} has no commitments array`);
        return [];
      }

      return tier.commitments.map((commitment) => ({
        ...commitment,
        tierName: tier.name,
        tierId: tier.id,
      }));
    });

    // Group commitments by user address and sum amounts
    const patronMap: Record<string, DeduplicatedCommitment> = {};

    commitments.forEach((commitment) => {
      const userKey = commitment.user_address.toLowerCase();

      if (!patronMap[userKey]) {
        patronMap[userKey] = {
          user_address: commitment.user_address,
          total_amount: 0,
          latest_committed_at: commitment.committed_at,
          tiers: [],
          user: commitment.user,
        };
      }

      // Parse commitment amount - could be a string from DB or a number
      // USDC amounts are stored with 6 decimal places (10000 = 0.01 USDC)
      const amountValue =
        typeof commitment.amount === "string"
          ? BigInt(commitment.amount)
          : BigInt(commitment.amount);

      // Add to running total for this patron
      patronMap[userKey].total_amount += Number(amountValue);

      // Track tiers with counts
      const existingTierIndex = patronMap[userKey].tiers.findIndex(
        (t) => t.tierId === commitment.tierId
      );

      if (existingTierIndex >= 0) {
        // Increment count for existing tier
        patronMap[userKey].tiers[existingTierIndex].count += 1;
      } else {
        // Add new tier with count 1
        patronMap[userKey].tiers.push({
          tierName: commitment.tierName,
          tierId: commitment.tierId,
          count: 1,
        });
      }

      // Keep the most recent commitment date
      if (
        new Date(commitment.committed_at) >
        new Date(patronMap[userKey].latest_committed_at)
      ) {
        patronMap[userKey].latest_committed_at = commitment.committed_at;
      }
    });

    // Convert map to array and sort by total amount (highest first)
    return Object.values(patronMap).sort((a, b) => {
      return b.total_amount - a.total_amount;
    });
  }, [pool?.tiers]);

  // Call the callback when patron count changes
  useEffect(() => {
    if (onPatronCountChange) {
      onPatronCountChange(deduplicatedCommitments.length);
    }
  }, [deduplicatedCommitments.length, onPatronCountChange]);

  // Format date to relative time (e.g., "2 hours ago")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Format token balance
  const formatBalance = (balance: string) => {
    try {
      // Ensure we're working with a string
      const balanceStr = String(balance);

      // USDC has 6 decimal places, not 18
      const rawFormatted = ethers.formatUnits(balanceStr, 6);
      const formatted = parseFloat(rawFormatted);

      // Format with appropriate precision
      if (formatted >= 1000000000) {
        return `${(formatted / 1000000000).toFixed(2)}B`;
      } else if (formatted >= 1000000) {
        return `${(formatted / 1000000).toFixed(2)}M`;
      } else if (formatted >= 1000) {
        return `${(formatted / 1000).toFixed(2)}K`;
      } else {
        // For values less than 1000, show with 2 decimal places
        // For very small values (0.01), we still want to show the actual amount
        return formatted.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
    } catch (error) {
      console.error("Error formatting balance:", balance, error);
      return "0.00";
    }
  };

  if (isLoading && deduplicatedCommitments.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading patrons: {error.message}
      </div>
    );
  }

  if (deduplicatedCommitments.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">
        No patrons found for this pool yet.
      </div>
    );
  }

  return (
    <div className="rounded-[12px] bg-[#FFFFFF0F] p-4">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div
            className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2"
            style={{ borderColor: "#836EF9" }}
          ></div>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-400">
          Failed to load patrons. Please try again later.
        </div>
      ) : deduplicatedCommitments.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          No patrons yet. Be the first to commit!
        </div>
      ) : (
        <div className="space-y-4">
          {deduplicatedCommitments.map((patron, index) => {
            const currentUserWalletAddress =
              privyUser?.wallet?.address?.toLowerCase();
            const currentUserSmartWalletAddress =
              dbUser?.smart_wallet_address?.toLowerCase();
            const isCurrentUser =
              Boolean(
                currentUserWalletAddress &&
                  patron.user_address.toLowerCase() === currentUserWalletAddress
              ) ||
              Boolean(
                currentUserSmartWalletAddress &&
                  patron.user_address.toLowerCase() ===
                    currentUserSmartWalletAddress
              ) ||
              Boolean(dbUser && patron.user?.id === dbUser.id);

            return (
              <div
                key={`${patron.user_address}-${index}`}
                className="flex flex-col sm:flex-row justify-between sm:items-center py-3 border-b border-[#FFFFFF14] last:border-0 gap-3 sm:gap-0"
              >
                <div className="flex items-center space-x-4">
                  <UserAvatar
                    avatarUrl={patron.user?.avatar_url}
                    name={
                      patron.user?.name || patron.user_address.substring(0, 6)
                    }
                    size={32}
                  />
                  <div>
                    <div className="flex items-center">
                      <p className="font-semibold">
                        {patron.user?.name ||
                          `${patron.user_address.substring(
                            0,
                            6
                          )}...${patron.user_address.substring(38)}`}
                      </p>
                      {isCurrentUser && (
                        <span className="text-blue-400 ml-2 text-sm">You</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-400">
                      <span>
                        @
                        {patron.user?.name?.replace(/\s+/g, "").toLowerCase() ||
                          patron.user_address.substring(0, 6)}
                      </span>
                      <span>•</span>
                      <span>{formatDate(patron.latest_committed_at)}</span>
                      <span>•</span>
                      <span className="text-purple-400">
                        {patron.tiers
                          .map((tier) =>
                            tier.count > 1
                              ? `${tier.count}×${tier.tierName}`
                              : tier.tierName
                          )
                          .join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center ml-auto sm:ml-0">
                  <span className="text-lg font-bold mr-2">
                    {formatBalance(patron.total_amount.toString())}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#836EF9" }}
                  >
                    USDC
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
