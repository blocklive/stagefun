import React, { useCallback } from "react";
import { FixedSizeList } from "react-window";
import Image from "next/image";
import { Token } from "@/types/token";

interface TokenItemProps {
  token: Token;
  onClick: () => void;
  style: React.CSSProperties;
}

// Individual token item
const TokenItem = ({ token, onClick, style }: TokenItemProps) => (
  <div
    style={style}
    className="px-4 py-2 hover:bg-gray-700 cursor-pointer transition-colors"
    onClick={onClick}
  >
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 relative flex-shrink-0">
        <Image
          src={token.logoURI || "/icons/generic-token.svg"}
          alt={token.symbol}
          fill
          sizes="32px"
          className="rounded-full"
        />
      </div>
      <div className="min-w-0">
        <div className="font-medium text-white truncate">{token.symbol}</div>
        <div className="text-sm text-gray-400 truncate">{token.name}</div>
      </div>
      {token.source === "custom" && (
        <div className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-full ml-auto">
          Custom
        </div>
      )}
    </div>
  </div>
);

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
  itemHeight = 60,
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
