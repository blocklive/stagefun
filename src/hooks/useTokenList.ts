import { useState, useEffect, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import { Token } from "@/types/token";
import { useTokenStorage } from "./useTokenStorage";
import { usePlatformTokens } from "./usePlatformTokens";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Core tokens that are always available
const CORE_TOKENS: Token[] = [
  {
    address: CONTRACT_ADDRESSES.monadTestnet.usdc,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoURI: "/icons/usdc-logo.svg",
    source: "core",
    hasLiquidity: true, // Core tokens always have liquidity
  },
  {
    address: "NATIVE", // Special marker for native MON
    symbol: "MON",
    name: "Monad",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
    source: "core",
    hasLiquidity: true, // Core tokens always have liquidity
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.officialWmon, // Official WMON address
    symbol: "WMON",
    name: "Wrapped MON",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
    source: "core",
    hasLiquidity: true, // Core tokens always have liquidity
  },
];

// Search configuration
const SEARCH_OPTIONS = {
  keys: [
    { name: "symbol", weight: 0.5 },
    { name: "name", weight: 0.3 },
    { name: "address", weight: 0.2 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
};

// Type for Fuse search result
interface FuseSearchResult {
  item: Token;
  refIndex: number;
  score?: number;
}

export interface TokenListOptions {
  onlyWithLiquidity?: boolean;
  onlyMainTokens?: boolean;
}

export function useTokenList({
  onlyWithLiquidity = false,
  onlyMainTokens = false,
}: TokenListOptions = {}) {
  const { customTokens, recentTokens, addRecentToken } = useTokenStorage();
  const { platformTokens, isLoading: isPlatformLoading } = usePlatformTokens({
    onlyWithLiquidity,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Combined list of all tokens
  const allTokens = useMemo(() => {
    // If we only want the main tokens, just return CORE_TOKENS
    if (onlyMainTokens) {
      return CORE_TOKENS;
    }

    const combinedTokens: Token[] = [
      ...CORE_TOKENS,
      ...platformTokens,
      ...customTokens,
      ...recentTokens,
    ];

    // Filter by liquidity if requested
    const filteredByLiquidity = onlyWithLiquidity
      ? combinedTokens.filter(
          (token) => token.hasLiquidity || token.source === "core"
        )
      : combinedTokens;

    // Remove duplicates by address
    const uniqueTokens = filteredByLiquidity.reduce<Token[]>((acc, token) => {
      const existingIndex = acc.findIndex(
        (t) => t.address.toLowerCase() === token.address.toLowerCase()
      );

      if (existingIndex === -1) {
        acc.push(token);
      } else {
        // Prioritize tokens from more trusted sources
        const existing = acc[existingIndex];
        const sourcePriority = {
          core: 1,
          platform: 2,
          recent: 3,
          custom: 4,
        };

        const existingPriority =
          sourcePriority[existing.source as keyof typeof sourcePriority] || 99;
        const newPriority =
          sourcePriority[token.source as keyof typeof sourcePriority] || 99;

        if (newPriority < existingPriority) {
          acc[existingIndex] = token;
        }
      }

      return acc;
    }, []);

    return uniqueTokens;
  }, [
    CORE_TOKENS,
    platformTokens,
    customTokens,
    recentTokens,
    onlyWithLiquidity,
    onlyMainTokens,
  ]);

  // Create Fuse instance for searching
  const fuse = useMemo(() => new Fuse(allTokens, SEARCH_OPTIONS), [allTokens]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Filtered tokens based on search
  const filteredTokens = useMemo(() => {
    if (!debouncedSearchTerm) {
      // If no search, show categorized tokens
      return {
        all: allTokens,
        core: CORE_TOKENS,
        platform: platformTokens,
        recent: recentTokens,
        custom: customTokens,
      };
    }

    setIsSearching(true);

    // If searching for an address, do exact match
    if (
      debouncedSearchTerm.startsWith("0x") &&
      debouncedSearchTerm.length > 10
    ) {
      const exactMatch = allTokens.find(
        (token) =>
          token.address.toLowerCase() === debouncedSearchTerm.toLowerCase()
      );

      const results = exactMatch ? [exactMatch] : [];
      setIsSearching(false);
      return {
        all: results,
        core: [],
        platform: [],
        recent: [],
        custom: [],
      };
    }

    // Otherwise use fuzzy search
    const searchResults = fuse
      .search(debouncedSearchTerm)
      .map((result: FuseSearchResult) => result.item);
    setIsSearching(false);

    return {
      all: searchResults,
      core: searchResults.filter((token: Token) => token.source === "core"),
      platform: searchResults.filter(
        (token: Token) => token.source === "platform"
      ),
      recent: searchResults.filter((token: Token) => token.source === "recent"),
      custom: searchResults.filter((token: Token) => token.source === "custom"),
    };
  }, [
    allTokens,
    CORE_TOKENS,
    platformTokens,
    recentTokens,
    customTokens,
    debouncedSearchTerm,
    fuse,
  ]);

  // Mark a token as recently used
  const markTokenAsRecent = useCallback(
    (token: Token) => {
      addRecentToken(token);
    },
    [addRecentToken]
  );

  return {
    allTokens,
    coreTokens: CORE_TOKENS,
    platformTokens,
    customTokens,
    recentTokens,
    filteredTokens,
    searchTerm,
    setSearchTerm,
    isLoading: isPlatformLoading || isSearching,
    markTokenAsRecent,
  };
}
