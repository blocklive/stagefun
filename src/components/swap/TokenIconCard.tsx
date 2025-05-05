import React from "react";
import Image from "next/image";
import { Token } from "@/types/token";

// Known token icons map
const TOKEN_ICONS: Record<string, string> = {
  USDC: "/icons/usdc-logo.svg",
  MON: "/icons/mon-logo.svg",
  WMON: "/icons/mon-logo.svg",
  // Add more tokens as needed
};

// Token display name mapping
const TOKEN_DISPLAY_NAMES: Record<string, string> = {
  USDC: "USD Coin",
  MON: "Monad",
  WMON: "Wrapped MON",
  // Add more token display name mappings as needed
};

interface TokenIconCardProps {
  token: Token;
  onClick?: () => void;
}

export function TokenIconCard({ token, onClick }: TokenIconCardProps) {
  const tokenSymbol = token.symbol;
  const isKnownToken = TOKEN_ICONS[tokenSymbol] !== undefined;

  // Get a better display name for the token if available
  const displayName = TOKEN_DISPLAY_NAMES[tokenSymbol] || token.name;

  return (
    <div
      className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4"
      onClick={onClick}
    >
      <div className="flex items-center">
        <div
          className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: "#2A2640" }}
        >
          {TOKEN_ICONS[tokenSymbol] ? (
            <Image
              src={TOKEN_ICONS[tokenSymbol]}
              alt={tokenSymbol}
              width={48}
              height={48}
              className="object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-semibold">
              {tokenSymbol.charAt(0)}
            </div>
          )}
        </div>
        <div className="ml-4 flex-1">
          <h3 className="font-bold flex items-center">
            {displayName}
            {isKnownToken && (
              <span
                className="inline-block h-2 w-2 ml-1.5 bg-[#836EF9] opacity-60 rounded-full"
                aria-label="Popular token"
              ></span>
            )}
          </h3>
          <div className="flex items-center text-sm">
            <span className="text-gray-400">{tokenSymbol}</span>
          </div>
        </div>
        {token.source === "custom" && (
          <div className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-full ml-auto">
            Custom
          </div>
        )}
      </div>
    </div>
  );
}
