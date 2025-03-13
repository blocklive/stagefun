"use client";

import { Pool, User } from "../../../../lib/supabase";
import { useState, useEffect } from "react";
import { formatCurrency } from "../../../../lib/utils";

interface UserCommitmentProps {
  pool: Pool | null;
  dbUser: User | null;
  userCommitment: {
    user_id: string;
    pool_id: string;
    amount: number;
    created_at: string;
    user: User;
    onChain: boolean;
  } | null;
  isCommitmentsLoading: boolean;
  commitmentsError: any;
  commitAmount: string;
  isApproving: boolean;
  walletsReady: boolean;
  biconomyWalletAddress: string | null;
  usdcBalance: string;
  setCommitAmount: (value: string) => void;
  handleCommit: () => Promise<void>;
  handleBiconomyCommit: () => Promise<void>;
}

export default function UserCommitment({
  pool,
  dbUser,
  userCommitment,
  isCommitmentsLoading,
  commitmentsError,
}: UserCommitmentProps) {
  // State to track if we should show the error (only after a delay)
  const [showError, setShowError] = useState(false);

  // Reset error state when loading state changes
  useEffect(() => {
    if (isCommitmentsLoading) {
      setShowError(false);
    }
  }, [isCommitmentsLoading]);

  // Only show error after a significant delay to avoid flashing
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (commitmentsError && !isCommitmentsLoading) {
      // Wait 8 seconds before showing the error to give time for retries
      timer = setTimeout(() => {
        setShowError(true);
      }, 8000);
    } else {
      setShowError(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [commitmentsError, isCommitmentsLoading]);

  if (!pool || !dbUser) return null;

  // Show loading state while commitments are being fetched
  if (isCommitmentsLoading || (commitmentsError && !showError)) {
    return (
      <div className="mt-6 p-4 bg-[#1A1625] rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Your Total Commitment</h3>
        <div className="p-3 rounded-lg bg-[#2A2640] flex justify-center">
          <div
            className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2"
            style={{ borderColor: "#836EF9" }}
          ></div>
        </div>
      </div>
    );
  }

  // Check if there was an error fetching commitments - only show after loading is complete AND delay has passed
  if (commitmentsError && showError) {
    return (
      <div className="mt-6 p-4 bg-[#1A1625] rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Your Total Commitment</h3>
        <div className="p-3 rounded-lg bg-[#2A2640] text-center">
          <p className="text-red-400">
            Unable to fetch your token balance. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // If user hasn't committed to this pool, don't show the section
  if (!userCommitment) return null;

  return (
    <div className="mt-6 p-4 bg-[#1A1625] rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Your Commitment</h3>
      <div className="p-4 rounded-lg bg-[#2A2640]">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Amount:</span>
          <div className="flex items-center">
            <span className="text-xl font-bold mr-2">
              {userCommitment.amount.toFixed(2)}
            </span>
            <span className="text-sm font-medium" style={{ color: "#836EF9" }}>
              {pool.currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
