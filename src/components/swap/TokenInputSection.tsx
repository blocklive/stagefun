import React from "react";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { BalanceSkeleton } from "./BalanceSkeleton";
import { Token } from "@/types/token";

interface TokenInputSectionProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  token: Token;
  onTokenSelect: (token: Token) => void;
  tokens: Token[];
  balance: string;
  disabled?: boolean;
  secondaryDisabled?: boolean;
  balanceLoading?: boolean;
  tokenLoading?: boolean;
}

export function TokenInputSection({
  label = "Input",
  value,
  onChange,
  token,
  onTokenSelect,
  tokens,
  balance,
  disabled = false,
  secondaryDisabled = false,
  balanceLoading = false,
  tokenLoading = false,
}: TokenInputSectionProps) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-gray-400">{label}</label>

        <div className="text-sm flex items-center">
          {balanceLoading ? (
            <BalanceSkeleton />
          ) : (
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-400 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <span className="font-medium text-gray-300">{balance}</span>
            </div>
          )}
        </div>
      </div>
      <AmountInput
        value={value}
        onChange={onChange}
        max={balance}
        showMaxButton={!balanceLoading}
        onMaxClick={() => onChange(balance)}
        disabled={disabled || balanceLoading}
      />
      <div className="mt-2">
        <TokenSelector
          selectedToken={token}
          onTokenSelect={onTokenSelect}
          tokens={tokens}
          disabled={disabled || secondaryDisabled}
          loading={tokenLoading}
        />
      </div>
    </div>
  );
}
