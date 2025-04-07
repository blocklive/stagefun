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
}

export default function PatronsTab({
  pool,
  isLoading,
  error,
}: PatronsTabProps) {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();

  // Transform all commitments to a flat list with tier info
  const allCommitments = React.useMemo(() => {
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

    // Sort by most recent first
    return commitments.sort((a, b) => {
      return (
        new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime()
      );
    });
  }, [pool?.tiers]);

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
      // USDC has 6 decimal places, not 18
      const rawFormatted = ethers.formatUnits(balance, 6);

      const formatted = parseFloat(rawFormatted);

      // If the number is very small (less than 0.01), show it as 0
      if (formatted < 0.01) {
        return "0";
      }

      // If the number is very large, format it with K/M/B suffixes
      if (formatted >= 1000000000) {
        return `${(formatted / 1000000000).toFixed(2)}B`;
      } else if (formatted >= 1000000) {
        return `${(formatted / 1000000).toFixed(2)}M`;
      } else if (formatted >= 1000) {
        return `${(formatted / 1000).toFixed(2)}K`;
      }

      // For values between 0.01 and 1000, show with 2 decimal places
      return formatted.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      console.error("Error formatting balance:", balance, error);
      return "0";
    }
  };

  if (isLoading && allCommitments.length === 0) {
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

  if (allCommitments.length === 0 && !isLoading) {
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
      ) : allCommitments.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          No patrons yet. Be the first to commit!
        </div>
      ) : (
        <div className="space-y-4">
          {allCommitments.map((commitment, index) => {
            const currentUserWalletAddress =
              privyUser?.wallet?.address?.toLowerCase();
            const currentUserSmartWalletAddress =
              dbUser?.smart_wallet_address?.toLowerCase();
            const isCurrentUser =
              Boolean(
                currentUserWalletAddress &&
                  commitment.user_address.toLowerCase() ===
                    currentUserWalletAddress
              ) ||
              Boolean(
                currentUserSmartWalletAddress &&
                  commitment.user_address.toLowerCase() ===
                    currentUserSmartWalletAddress
              ) ||
              Boolean(dbUser && commitment.user?.id === dbUser.id);

            return (
              <div
                key={`${commitment.user_address}-${commitment.committed_at}-${index}`}
                className="flex justify-between items-center py-2 border-b border-[#FFFFFF14] last:border-0"
              >
                <div className="flex items-center space-x-4">
                  <UserAvatar
                    avatarUrl={commitment.user?.avatar_url}
                    name={
                      commitment.user?.name ||
                      commitment.user_address.substring(0, 6)
                    }
                    size={32}
                  />
                  <div>
                    <div className="flex items-center">
                      <p className="font-semibold">
                        {commitment.user?.name ||
                          `${commitment.user_address.substring(
                            0,
                            6
                          )}...${commitment.user_address.substring(38)}`}
                      </p>
                      {isCurrentUser && (
                        <span className="text-blue-400 ml-2 text-sm">You</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>
                        @
                        {commitment.user?.name
                          ?.replace(/\s+/g, "")
                          .toLowerCase() ||
                          commitment.user_address.substring(0, 6)}
                      </span>
                      <span>•</span>
                      <span>{formatDate(commitment.committed_at)}</span>
                      <span>•</span>
                      <span className="text-purple-400">
                        {commitment.tierName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-bold mr-2">
                    {formatBalance(commitment.amount.toString())}
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
