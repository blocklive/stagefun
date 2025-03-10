"use client";

import { Pool, User } from "../../../../lib/supabase";

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
  commitAmount,
  isApproving,
  walletsReady,
  biconomyWalletAddress,
  usdcBalance,
  setCommitAmount,
  handleCommit,
  handleBiconomyCommit,
}: UserCommitmentProps) {
  if (!pool || !dbUser) return null;

  // Check if there was an error fetching commitments
  if (commitmentsError) {
    return (
      <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Your Total Commitment</h3>
        <div className="p-3 rounded-lg bg-[#1A1625] text-center">
          <p className="text-red-400">
            Unable to fetch your token balance. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while commitments are being fetched
  if (isCommitmentsLoading) {
    return (
      <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Your Total Commitment</h3>
        <div className="p-3 rounded-lg bg-[#1A1625] flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  // If user hasn't committed to this pool, don't show the section
  if (!userCommitment) return null;

  return (
    <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Your Commitment</h3>
      {userCommitment ? (
        <div className="p-4 rounded-lg bg-[#1A1625]">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Amount:</span>
            <div className="flex items-center">
              <span className="text-xl font-bold mr-2">
                {userCommitment.amount}
              </span>
              <span className="text-sm font-medium text-purple-400">
                {pool.currency}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-400 mb-4">
            You haven&apos;t committed to this pool yet. Enter an amount to
            commit:
          </p>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={commitAmount}
                onChange={(e) => setCommitAmount(e.target.value)}
                placeholder="Amount in USDC"
                className="bg-gray-700 text-white px-4 py-2 rounded-lg flex-grow"
                disabled={isApproving}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleCommit}
                  disabled={
                    isApproving ||
                    !commitAmount ||
                    parseFloat(commitAmount) <= 0 ||
                    !walletsReady
                  }
                  className={`px-4 py-2 rounded-lg ${
                    isApproving
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  } transition-colors duration-200`}
                  title="Standard commit (requires gas)"
                >
                  {isApproving ? (
                    <div className="flex items-center space-x-2">
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Commit"
                  )}
                </button>

                <button
                  onClick={handleBiconomyCommit}
                  disabled={
                    isApproving ||
                    !commitAmount ||
                    parseFloat(commitAmount) <= 0 ||
                    !biconomyWalletAddress
                  }
                  className={`px-4 py-2 rounded-lg ${
                    isApproving
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700"
                  } transition-colors duration-200`}
                  title="Gasless commit (no confirmation dialogs)"
                >
                  {isApproving ? (
                    <div className="flex items-center space-x-2">
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Commit Gasless"
                  )}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Available: {usdcBalance ? `${usdcBalance} USDC` : "Loading..."}
            </p>
            {!walletsReady && (
              <p className="text-sm text-yellow-500">
                Wallet not ready. Please wait...
              </p>
            )}
            {biconomyWalletAddress && (
              <p className="text-sm text-green-500">
                Biconomy Smart Account: {biconomyWalletAddress.slice(0, 6)}...
                {biconomyWalletAddress.slice(-4)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
