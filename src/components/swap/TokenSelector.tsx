import React, { useState } from "react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

interface TokenSelectorProps {
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
  tokens: Token[];
  disabled?: boolean;
}

export function TokenSelector({
  selectedToken,
  onTokenSelect,
  tokens,
  disabled = false,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
          disabled
            ? "bg-gray-800 border-gray-700 cursor-not-allowed"
            : "bg-gray-800 border-gray-700 hover:border-[#836ef9]"
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {selectedToken ? (
          <>
            <div className="w-6 h-6 relative">
              <Image
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                fill
                sizes="24px"
                className="rounded-full"
              />
            </div>
            <span className="font-medium text-white">
              {selectedToken.symbol}
            </span>
          </>
        ) : (
          <span className="text-gray-400">Select token</span>
        )}
        {!disabled && <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search token name or paste address"
              className="w-full px-3 py-2 border border-gray-700 bg-gray-900 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#836ef9]"
            />
          </div>
          <ul className="py-1">
            {tokens.map((token) => (
              <li key={token.address}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center space-x-3"
                  onClick={() => handleTokenSelect(token)}
                >
                  <div className="w-8 h-8 relative">
                    <Image
                      src={token.logoURI}
                      alt={token.symbol}
                      fill
                      sizes="32px"
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <div className="font-medium text-white">{token.symbol}</div>
                    <div className="text-sm text-gray-400">{token.name}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
