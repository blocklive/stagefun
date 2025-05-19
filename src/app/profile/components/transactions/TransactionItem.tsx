import React from "react";
import { TransactionItem as TransactionItemType } from "@/hooks/useTransactionHistory";
import {
  getTransactionAmountWithSign,
  getTransactionAmountColorClass,
  shortenAddress,
} from "@/lib/utils/transactionUtils";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

interface TransactionItemProps {
  transaction: TransactionItemType;
  walletAddress: string;
}

export default function TransactionItem({
  transaction,
  walletAddress,
}: TransactionItemProps) {
  // Determine if transaction is incoming or outgoing
  const isIncoming =
    transaction.to.toLowerCase() === walletAddress?.toLowerCase();

  // Format transaction amount with + or - sign
  const formattedAmount = getTransactionAmountWithSign(
    transaction,
    walletAddress
  );
  const amountColorClass = getTransactionAmountColorClass(
    transaction,
    walletAddress
  );

  return (
    <div className="bg-[#1A1825] rounded-xl flex items-center p-4 mb-2 hover:bg-[#2A2640] transition-colors">
      {/* Transaction icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isIncoming ? "bg-green-900/30" : "bg-red-900/30"
        }`}
      >
        {isIncoming ? (
          <FaArrowDown className="text-green-500" />
        ) : (
          <FaArrowUp className="text-red-500" />
        )}
      </div>

      {/* Transaction details */}
      <div className="ml-3 flex-1">
        <div className="flex flex-row justify-between">
          <div className="font-medium">
            {isIncoming
              ? `Received ${transaction.asset || ""}`
              : `Sent ${transaction.asset || ""}`}
          </div>
          <div className={`font-medium ${amountColorClass}`}>
            {formattedAmount}
          </div>
        </div>

        <div className="flex flex-row justify-between text-sm text-gray-400">
          <div>
            {isIncoming
              ? `From ${shortenAddress(transaction.from)}`
              : `To ${shortenAddress(transaction.to)}`}
          </div>

          {/* Add timestamp if available */}
          {transaction.metadata?.blockTimestamp && (
            <div>
              {new Date(transaction.metadata.blockTimestamp).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
