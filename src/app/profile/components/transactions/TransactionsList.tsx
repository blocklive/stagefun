import React, { useEffect } from "react";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { groupTransactionsByDate } from "@/lib/utils/transactionUtils";
import TransactionDateGroup from "./TransactionDateGroup";
import { FaSyncAlt } from "react-icons/fa";
import { useInView } from "react-intersection-observer";

interface TransactionsListProps {
  walletAddress: string;
  chainId?: string;
}

export default function TransactionsList({
  walletAddress,
  chainId = "monad-test-v2",
}: TransactionsListProps) {
  const {
    transactions,
    isLoading,
    isError,
    error,
    loadMore,
    hasMore,
    refresh,
  } = useTransactionHistory(walletAddress, chainId);

  // Set up observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0,
  });

  // Call loadMore when bottom is reached
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMore();
    }
  }, [inView, hasMore, loadMore, isLoading]);

  // Group transactions by date
  const groupedTransactions = groupTransactionsByDate(transactions);
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => {
    // Sort dates in descending order (newest first)
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="space-y-4 mt-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Transaction History</h3>
        <button
          onClick={refresh}
          className="p-2 rounded-lg bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF1A]"
          disabled={isLoading}
          aria-label="Refresh transactions"
        >
          <FaSyncAlt className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && transactions.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-[#836EF9] animate-spin rounded-full mb-4"></div>
            <p>Loading transactions...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-8 text-red-400">
          <p className="mb-2">Failed to load transactions</p>
          <p className="text-sm">{error || "An unknown error occurred"}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && transactions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No transactions found</p>
        </div>
      )}

      {/* Transaction list */}
      <div className="overflow-y-auto pr-2 pb-32">
        {sortedDates.map((date) => (
          <TransactionDateGroup
            key={date}
            date={date}
            transactions={groupedTransactions[date]}
            walletAddress={walletAddress}
          />
        ))}

        {/* Loading indicator for infinite scroll */}
        {hasMore && (
          <div ref={ref} className="flex justify-center py-4 h-20">
            {isLoading && (
              <div className="w-6 h-6 border-t-2 border-b-2 border-[#836EF9] animate-spin rounded-full"></div>
            )}
          </div>
        )}

        {/* End message */}
        {!hasMore && transactions.length > 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No more transactions to load
          </div>
        )}
      </div>
    </div>
  );
}
