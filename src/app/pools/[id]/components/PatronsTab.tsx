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

  // Combine all commitments from all tiers and transform to patron format
  const patrons = React.useMemo(() => {
    console.log("Pool tiers in PatronsTab:", pool?.tiers);

    if (!pool?.tiers) {
      console.log("No tiers found in pool data");
      return [];
    }

    // Extract all commitments from all tiers
    const allCommitments = pool.tiers.flatMap((tier) => {
      if (!tier) {
        console.log("Found a null/undefined tier");
        return [];
      }

      // Some tiers might have undefined commitments
      if (!tier.commitments) {
        console.log(`Tier ${tier.id} has no commitments array`);
        return [];
      }

      console.log(`Tier ${tier.id} commitments:`, tier.commitments);
      return tier.commitments || [];
    });

    console.log("All commitments combined:", allCommitments);

    if (allCommitments.length === 0) {
      console.log("No commitments found in any tiers");
      return [];
    }

    // Combine duplicate users (in case someone committed to multiple tiers)
    const patronsByAddress: Record<
      string,
      {
        address: string;
        balance: string;
        userId?: string;
        username?: string;
        displayName?: string;
        avatarUrl?: string;
        isCurrentUser?: boolean;
      }
    > = {};

    allCommitments.forEach((commitment) => {
      const address = commitment.user_address.toLowerCase();
      const user = commitment.user;
      const currentUserWalletAddress =
        privyUser?.wallet?.address?.toLowerCase();
      const currentUserSmartWalletAddress =
        dbUser?.smart_wallet_address?.toLowerCase();
      const isCurrentUser: boolean =
        Boolean(
          currentUserWalletAddress && address === currentUserWalletAddress
        ) ||
        Boolean(
          currentUserSmartWalletAddress &&
            address === currentUserSmartWalletAddress
        ) ||
        Boolean(dbUser && user?.id === dbUser.id);

      // Debug user info
      console.log(`Processing commitment for address ${address}:`, {
        hasUser: !!user,
        userName: user?.name,
        userAvatar: user?.avatar_url,
        isCurrentUser,
      });

      // Convert amount to ethers-compatible string
      // Assuming amount is stored in base units (e.g., 1000000 for 1 USDC)
      const balanceAsString = commitment.amount.toString();

      if (patronsByAddress[address]) {
        // Add to existing balance
        const existingBalance = ethers.getBigInt(
          patronsByAddress[address].balance
        );
        const newBalance = ethers.getBigInt(balanceAsString);
        patronsByAddress[address].balance = (
          existingBalance + newBalance
        ).toString();
      } else {
        // Create new patron entry
        patronsByAddress[address] = {
          address,
          balance: balanceAsString,
          userId: user?.id,
          username: user?.name
            ? user.name.replace(/\s+/g, "").toLowerCase()
            : address.substring(0, 6),
          displayName:
            user?.name ||
            `${address.substring(0, 6)}...${address.substring(
              address.length - 4
            )}`,
          avatarUrl: user?.avatar_url,
          isCurrentUser,
        };
      }
    });

    // Convert to array and sort by balance
    return Object.values(patronsByAddress).sort((a, b) => {
      const balanceA = ethers.getBigInt(a.balance);
      const balanceB = ethers.getBigInt(b.balance);
      return balanceB > balanceA ? 1 : -1;
    });
  }, [pool?.tiers, privyUser?.wallet?.address, dbUser]);

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

  if (isLoading && patrons.length === 0) {
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

  if (patrons.length === 0 && !isLoading) {
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
      ) : patrons.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          No patrons yet. Be the first to commit!
        </div>
      ) : (
        <div className="space-y-4">
          {patrons.map((patron, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b border-[#FFFFFF14] last:border-0"
            >
              <div className="flex items-center">
                <UserAvatar
                  avatarUrl={patron.avatarUrl}
                  name={
                    patron.displayName ||
                    patron.username ||
                    patron.address.substring(0, 6)
                  }
                  size={32}
                  className="mr-3"
                />
                <div>
                  <div className="flex items-center">
                    <p className="font-semibold">
                      {patron.displayName ||
                        patron.username ||
                        `${patron.address.substring(
                          0,
                          6
                        )}...${patron.address.substring(38)}`}
                    </p>
                    {patron.isCurrentUser && (
                      <span className="text-blue-400 ml-2 text-sm">You</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    @{patron.username || `${patron.address.substring(0, 6)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-lg font-bold mr-2">
                  {formatBalance(patron.balance)}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: "#836EF9" }}
                >
                  USDC
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
