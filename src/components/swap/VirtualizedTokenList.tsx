import React, { useCallback } from "react";
import { FixedSizeList } from "react-window";
import { Token } from "@/types/token";
import {
  TokenIcon,
  TOKEN_ICONS,
  TOKEN_DISPLAY_NAMES,
  isKnownToken,
} from "../token/TokenIcon";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface TokenItemProps {
  token: Token;
  onClick: () => void;
  style: React.CSSProperties;
}

// Individual token item
const TokenItem = ({ token, onClick, style }: TokenItemProps) => {
  const tokenSymbol = token.symbol;

  // Get a better display name for the token if available
  const displayName = TOKEN_DISPLAY_NAMES[tokenSymbol] || token.name;

  return (
    <div
      style={style}
      className="p-4 bg-[#FFFFFF0A] hover:bg-[#2A2640] transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center">
        <TokenIcon
          symbol={tokenSymbol}
          logoURI={token.logoURI}
          address={token.address !== "NATIVE" ? token.address : null}
          size="lg"
        />
        <div className="ml-4 flex-1 min-w-0">
          <div className="font-bold text-white truncate flex items-center">
            {displayName}
            {token.isVerified && (
              <span
                className="inline-block h-2 w-2 ml-1.5 bg-[#836EF9] opacity-70 rounded-full"
                aria-label="Verified token"
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
