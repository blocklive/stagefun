import React from "react";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

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
}: TokenInputSectionProps) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-gray-400">{label}</label>
        <div className="text-sm text-gray-400">
          Balance: <span className="font-medium">{balance}</span>
        </div>
      </div>
      <AmountInput
        value={value}
        onChange={onChange}
        max={balance}
        showMaxButton
        onMaxClick={() => onChange(balance)}
        disabled={disabled}
      />
      <div className="mt-2">
        <TokenSelector
          selectedToken={token}
          onTokenSelect={onTokenSelect}
          tokens={tokens}
          disabled={disabled || secondaryDisabled}
        />
      </div>
    </div>
  );
}
