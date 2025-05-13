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
  tagLabel?: string;
  showUsdValue?: boolean;
  usdValue?: string;
  hideBuyingControls?: boolean;
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
  tagLabel,
  showUsdValue = false,
  usdValue,
  hideBuyingControls = false,
}: TokenInputSectionProps) {
  // Helper function to handle percentage buttons
  const handlePercentClick = (percent: number) => {
    if (balanceLoading || !balance) return;

    console.log("balance", balance, percent);

    // Clean the balance string by removing any non-numeric characters except decimal points
    const cleanedBalance = String(balance).replace(/[^0-9.]/g, "");
    const balanceNum = parseFloat(cleanedBalance);

    console.log("balanceNum", balanceNum);
    if (isNaN(balanceNum) || balanceNum <= 0) return;

    // Calculate the percentage amount
    const calculatedAmount = balanceNum * percent;

    console.log("calculatedAmount", calculatedAmount);
    console.log("token.decimals", token.decimals);

    // Format to avoid excessive decimals based on token decimals
    // Ensure token.decimals is converted to a number
    const tokenDecimals =
      typeof token.decimals === "bigint"
        ? Number(token.decimals)
        : token.decimals;

    // Use at most 6 decimal places or the token's decimals, whichever is smaller
    const maxDecimals = Math.min(tokenDecimals, 6);
    console.log("maxDecimals", maxDecimals);
    const formattedAmount = calculatedAmount.toFixed(maxDecimals);

    console.log("formattedAmount", formattedAmount);
    // Remove trailing zeros
    const trimmedAmount = parseFloat(formattedAmount).toString();
    console.log("trimmedAmount", trimmedAmount);

    onChange(trimmedAmount);
  };

  // Common styles to ensure alignment
  const inputContainerStyle = { paddingLeft: "5px" };
  const usdValueStyle = { paddingLeft: "7px" };

  return (
    <div className="mb-4">
      {tagLabel && (
        <div className="mb-2">
          <span className="text-sm text-gray-400">{tagLabel}</span>
        </div>
      )}

      <div className="rounded-lg p-3 bg-[#FFFFFF0A]">
        {/* Input and token selector in one row */}
        <div className="flex items-center">
          {/* Left side: Input amount (taking more space) */}
          <div className="flex-grow mr-2" style={inputContainerStyle}>
            <AmountInput
              value={value}
              onChange={onChange}
              max={balance}
              disabled={disabled || balanceLoading}
              className="w-full"
            />
          </div>

          {/* Right side: Token selector */}
          <div className="flex-shrink-0">
            <TokenSelector
              selectedToken={token}
              onTokenSelect={onTokenSelect}
              tokens={tokens}
              disabled={disabled || secondaryDisabled}
              loading={tokenLoading}
            />
          </div>
        </div>

        {/* USD value and Balance on the same line */}
        <div className="flex justify-between mt-1 text-sm text-gray-400">
          {/* USD value on the left - always show with $0 as default */}
          <div style={usdValueStyle}>${usdValue || "0"}</div>

          {/* Balance on the right */}
          <div>
            {balanceLoading ? (
              <BalanceSkeleton />
            ) : (
              <span>Balance: {balance}</span>
            )}
          </div>
        </div>

        {/* Percentage buttons - only show if hideBuyingControls is false */}
        {!hideBuyingControls && (
          <div className="mt-2 -ml-2.5">
            <button
              type="button"
              className="mr-2 px-2 py-1 text-xs font-medium text-[#836ef9] bg-[#836ef9]/20 rounded-md hover:bg-[#836ef9]/30"
              onClick={() => handlePercentClick(0.25)}
              disabled={disabled || balanceLoading}
            >
              25%
            </button>
            <button
              type="button"
              className="mr-2 px-2 py-1 text-xs font-medium text-[#836ef9] bg-[#836ef9]/20 rounded-md hover:bg-[#836ef9]/30"
              onClick={() => handlePercentClick(0.5)}
              disabled={disabled || balanceLoading}
            >
              50%
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs font-medium text-[#836ef9] bg-[#836ef9]/20 rounded-md hover:bg-[#836ef9]/30"
              onClick={() => handlePercentClick(1)}
              disabled={disabled || balanceLoading}
            >
              MAX
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
