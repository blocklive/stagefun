import React from "react";
import { TransactionItem as TransactionItemType } from "@/hooks/useTransactionHistory";
import TransactionItem from "./TransactionItem";

interface TransactionDateGroupProps {
  date: string;
  transactions: TransactionItemType[];
  walletAddress: string;
}

export default function TransactionDateGroup({
  date,
  transactions,
  walletAddress,
}: TransactionDateGroupProps) {
  return (
    <div className="mb-6">
      <div className="text-lg font-medium text-gray-400 mb-3">{date}</div>

      <div className="space-y-2">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.hash}
            transaction={transaction}
            walletAddress={walletAddress}
          />
        ))}
      </div>
    </div>
  );
}
