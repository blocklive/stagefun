"use client";

import { usePoolPatrons } from "../../../../hooks/usePoolPatrons";
import Image from "next/image";
import { ethers } from "ethers";
import { useEffect } from "react";

interface PatronsTabProps {
  poolAddress: string | null;
}

export default function PatronsTab({ poolAddress }: PatronsTabProps) {
  const { patrons, loading, error } = usePoolPatrons(poolAddress);

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

  if (loading && patrons.length === 0) {
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

  if (patrons.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        No patrons found for this pool yet.
      </div>
    );
  }

  return (
    <div className="mt-4 w-full">
      <div className="space-y-2">
        {patrons.map((patron, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-4 rounded-lg ${
              patron.isCurrentUser
                ? "bg-[#1F1B3A] border border-[#3B3472]"
                : "bg-[#1A1727]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2A2640] flex items-center justify-center text-sm">
                {patron.avatarUrl ? (
                  <Image
                    src={patron.avatarUrl}
                    alt={patron.displayName || patron.username || ""}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {patron.displayName?.charAt(0) ||
                      patron.username?.charAt(0) ||
                      patron.address.substring(0, 2)}
                  </span>
                )}
              </div>
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
              <div
                className="w-6 h-6 mr-2 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#836EF9" }}
              >
                <span className="text-xs text-white font-bold">LP</span>
              </div>
              <span className="text-lg font-medium">
                {formatBalance(patron.balance)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
