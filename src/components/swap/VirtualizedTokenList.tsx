import React, { useCallback } from "react";
import { FixedSizeList } from "react-window";
import Image from "next/image";
import { Token } from "@/types/token";

// Known token icons map
const TOKEN_ICONS: Record<string, string> = {
  USDC: "/icons/usdc-logo.svg",
  MON: "/icons/mon-logo.svg",
  // Add more tokens as needed
};

// Token display name mapping
const TOKEN_DISPLAY_NAMES: Record<string, string> = {
  USDC: "USD Coin",
  MON: "Monad",
  // Add more token display name mappings as needed
};

interface TokenItemProps {
  token: Token;
  onClick: () => void;
  style: React.CSSProperties;
}

// Individual token item
const TokenItem = ({ token, onClick, style }: TokenItemProps) => {
  const tokenSymbol = token.symbol;
  const isKnownToken = TOKEN_ICONS[tokenSymbol] !== undefined;

  // Get a better display name for the token if available
  const displayName = TOKEN_DISPLAY_NAMES[tokenSymbol] || token.name;

  return (
    <div
      style={style}
      className="p-4 bg-[#FFFFFF0A] hover:bg-[#2A2640] transition-colors cursor-pointer"
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
          ) : token.logoURI ? (
            <Image
              src={token.logoURI}
              alt={tokenSymbol}
              width={48}
              height={48}
              className="object-contain"
            />
          ) : (
            <span className="text-2xl font-semibold text-gray-400">
              {tokenSymbol.charAt(0)}
            </span>
          )}
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <div className="font-bold text-white truncate">
            {displayName}
            {isKnownToken && (
              <span
                className="inline-block h-2 w-2 ml-1.5 bg-[#836EF9] opacity-60 rounded-full"
                aria-label="Popular token"
              ></span>
            )}
          </div>
          <div className="text-sm text-gray-400 truncate">{tokenSymbol}</div>
        </div>
        {token.source === "custom" && (
          <div className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-full ml-auto">
            Custom
          </div>
        )}
      </div>
    </div>
  );
};

interface VirtualizedTokenListProps {
  tokens: Token[];
  onSelectToken: (token: Token) => void;
  height?: number;
  width?: string | number;
  itemHeight?: number;
  emptyMessage?: string;
}

export function VirtualizedTokenList({
  tokens,
  onSelectToken,
  height = 300,
  width = "100%",
  itemHeight = 72, // Increased to accommodate larger icons
  emptyMessage = "No tokens found",
}: VirtualizedTokenListProps) {
  // Render item callback for react-window
  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const token = tokens[index];
      return (
        <TokenItem
          token={token}
          style={style}
          onClick={() => onSelectToken(token)}
        />
      );
    },
    [tokens, onSelectToken]
  );

  if (tokens.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <FixedSizeList
      height={height}
      width={width}
      itemSize={itemHeight}
      itemCount={tokens.length}
      overscanCount={5}
    >
      {renderRow}
    </FixedSizeList>
  );
}
