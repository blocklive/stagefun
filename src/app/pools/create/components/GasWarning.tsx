import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

interface GasWarningProps {
  balance: string;
  minBalance?: number;
}

export default function GasWarning({
  balance,
  minBalance = 0.5,
}: GasWarningProps) {
  return (
    <div className="mx-6 mt-4 p-4 bg-[#1E1F25] border border-[#836EF9] border-opacity-50 rounded-lg">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-[#836EF9] bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
          <FaExclamationTriangle className="text-[#836EF9]" size={18} />
        </div>
        <div>
          <h3 className="font-bold text-white">Low MON Balance</h3>
          <p className="text-sm text-gray-300">
            Your wallet has {parseFloat(balance).toFixed(4)} MON. Deploying a
            pool requires at least {minBalance} MON to pay for gas. Use one of
            the options below to refill your wallet.
          </p>
        </div>
      </div>
    </div>
  );
}
