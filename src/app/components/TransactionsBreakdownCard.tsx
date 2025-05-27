"use client";

import React, { useState, useRef, useCallback } from "react";
import { useTransactions } from "../../hooks/useTransactions";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const TransactionsBreakdownCard = () => {
  const { transactions, isLoading, isLoadingMore, hasMore, error, loadMore } =
    useTransactions();
  const [isExpanded, setIsExpanded] = useState(false);
  const observer = useRef<IntersectionObserver>();

  const lastTransactionElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore, loadMore]
  );

  const formatPoints = (value: number): string => {
    return value.toLocaleString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionLabel = (actionType: string): string => {
    const [type, action] = actionType.split(":");
    switch (type) {
      case "funded":
        return "ROUND FUNDING";
      case "raised":
        return "ROUND CREATION";
      case "onboarding":
        return action?.toUpperCase() || "MISSION";
      case "checkin":
        return "DAILY CHECK-IN";
      default:
        return actionType.toUpperCase();
    }
  };

  const getActionColor = (actionType: string): string => {
    const [type] = actionType.split(":");
    switch (type) {
      case "funded":
        return "text-blue-400";
      case "raised":
        return "text-green-400";
      case "onboarding":
        return "text-purple-400";
      case "checkin":
        return "text-[#FFDD50]";
      default:
        return "text-gray-400";
    }
  };

  const getTransactionDetail = (transaction: any): string => {
    const metadata = transaction.metadata || {};
    const actionType = transaction.action_type || "";

    // Extract action from action_type (format: "type:action")
    const [type, action] = actionType.split(":");

    switch (type) {
      case "funded":
        if (action === "pool_commitment") {
          // Show round name if available from join, otherwise show address
          if (transaction.pool?.name) {
            return `Round: ${transaction.pool.name}`;
          } else if (metadata.poolAddress) {
            return `Round: ${metadata.poolAddress.slice(
              0,
              6
            )}...${metadata.poolAddress.slice(-4)}`;
          }
          return "Round commitment";
        }
        break;

      case "raised":
        if (action === "created_pool") {
          if (transaction.pool?.name) {
            return `Created: ${transaction.pool.name}`;
          } else if (metadata.poolName) {
            return `Created: ${metadata.poolName}`;
          }
          return "Round creation";
        } else if (action === "received_commitment") {
          if (metadata.funderAddress) {
            return `From: ${metadata.funderAddress.slice(
              0,
              6
            )}...${metadata.funderAddress.slice(-4)}`;
          }
          return "Received commitment";
        } else if (action === "pool_executing") {
          if (metadata.raisedAmount) {
            const raisedUSDC = (
              parseInt(metadata.raisedAmount) / 1e6
            ).toLocaleString();
            return `Round executed: $${raisedUSDC}`;
          }
          return "Round executed";
        }
        break;

      case "onboarding":
        if (metadata.missionId) {
          const missionNames: Record<string, string> = {
            link_x: "Linked X account",
            follow_x: "Followed on X",
            create_pool: "Created first round",
            swap_mon_usdc: "Swapped MON/USDC",
            swap_shmon: "Swapped SHMON",
            swap_aprmon: "Swapped APRMON",
            swap_gmon: "Swapped GMON",
            add_liquidity: "Added liquidity",
          };
          return (
            missionNames[metadata.missionId] || `Mission: ${metadata.missionId}`
          );
        }
        return "Mission completed";

      case "checkin":
        if (metadata.streak_count) {
          return `Day ${metadata.streak_count} streak`;
        }
        return "Daily check-in";

      default:
        // Fallback to reason or generic message
        return metadata.reason || "Activity reward";
    }

    return metadata.reason || "Activity reward";
  };

  if (isLoading) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner color="#8B5CF6" size={24} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
        <div className="text-center py-8 text-gray-400 text-sm uppercase tracking-wider">
          TRANSACTIONS UNAVAILABLE
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:bg-[#FFFFFF05] transition-colors rounded p-2 -m-2"
      >
        <div className="text-left">
          <h3 className="font-bold text-white text-base">
            Transaction History
          </h3>
          <div className="text-sm text-gray-500">All point transactions</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400 font-mono">
            {transactions.length} entries
          </div>
          <div className="text-gray-400 text-sm">{isExpanded ? "−" : "+"}</div>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#FFFFFF14]">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm uppercase tracking-wider">
              NO TRANSACTIONS YET
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.map((transaction, index) => {
                const isLast = index === transactions.length - 1;
                return (
                  <div
                    key={transaction.id}
                    ref={isLast ? lastTransactionElementRef : null}
                    className="p-3 bg-[#FFFFFF05] rounded border border-[#FFFFFF08] hover:bg-[#FFFFFF08] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs uppercase tracking-wider ${getActionColor(
                              transaction.action_type
                            )}`}
                          >
                            {getActionLabel(transaction.action_type)}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {formatDate(transaction.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {getTransactionDetail(transaction)}
                          </span>
                          <span
                            className={`text-sm font-mono font-bold ${
                              transaction.amount > 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {transaction.amount > 0 ? "+" : ""}
                            {formatPoints(transaction.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Loading More Indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner color="#8B5CF6" size={16} />
                  <span className="ml-2 text-xs text-gray-400 uppercase tracking-wider">
                    LOADING MORE...
                  </span>
                </div>
              )}

              {/* End of List Indicator */}
              {!hasMore && transactions.length > 0 && (
                <div className="text-center py-4 text-xs text-gray-500 uppercase tracking-wider">
                  END OF TRANSACTIONS
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionsBreakdownCard;
