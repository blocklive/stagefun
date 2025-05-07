import { useState, useEffect, useCallback, useRef } from "react";
import { TokenInfo } from "@/types/tokens";
import { tokenResolver } from "@/utils/tokenResolver";
import { useTokenMetadata } from "./useTokenMetadata";
import { useQueryParamDefaults } from "./useQueryParamDefaults";

interface UseTokenResolverProps {
  initialTokens: TokenInfo[];
  onTokenAChange?: (token: TokenInfo) => void;
  onTokenBChange?: (token: TokenInfo) => void;
  onAmountAChange?: (amount: string) => void;
  onAmountBChange?: (amount: string) => void;
}

interface UseTokenResolverResult {
  resolvedTokenA: TokenInfo | null;
  resolvedTokenB: TokenInfo | null;
  isLoadingTokens: boolean;
  source: string | null;
}

/**
 * Hook to resolve tokens from query parameters
 * Combines useQueryParamDefaults with token resolution and metadata fetching
 */
export function useTokenResolver({
  initialTokens,
  onTokenAChange,
  onTokenBChange,
  onAmountAChange,
  onAmountBChange,
}: UseTokenResolverProps): UseTokenResolverResult {
  // State
  const [resolvedTokenA, setResolvedTokenA] = useState<TokenInfo | null>(null);
  const [resolvedTokenB, setResolvedTokenB] = useState<TokenInfo | null>(null);
  const [source, setSource] = useState<string | null>(null);

  // Add refs to track processed tokens to prevent loops
  const processedTokensRef = useRef<{ [address: string]: boolean }>({});
  const initialSetupCompleteRef = useRef(false);
  const amountsProcessedRef = useRef(false);

  // Use token metadata hook for fetching token details
  const { isLoading: isLoadingMetadata, fetchTokenMetadata } =
    useTokenMetadata(initialTokens);

  // Get query parameters first, to avoid circular dependencies
  const queryParams = useQueryParamDefaults();

  // Internal handler for token A changes
  const handleTokenAChange = useCallback(
    async (address: string) => {
      // Skip if we've already processed this token
      const addressKey = address.toLowerCase();
      if (processedTokensRef.current[addressKey]) {
        return;
      }

      // Mark as processed to avoid loops
      processedTokensRef.current[addressKey] = true;

      // Try to resolve from known tokens first
      let token = tokenResolver.fromAddress(address, initialTokens);

      // If token is not found or it's marked as unknown, try to fetch metadata
      if (!token || token.symbol === "Unknown") {
        const fetchedToken = await fetchTokenMetadata(
          address,
          queryParams.tokenASymbol,
          queryParams.tokenBSymbol
        );
        if (fetchedToken) {
          token = fetchedToken;
        }
      }

      if (token) {
        setResolvedTokenA(token);
        onTokenAChange?.(token);
      }
    },
    [
      initialTokens,
      fetchTokenMetadata,
      queryParams.tokenASymbol,
      queryParams.tokenBSymbol,
      onTokenAChange,
    ]
  );

  // Internal handler for token B changes
  const handleTokenBChange = useCallback(
    async (address: string) => {
      // Skip if we've already processed this token
      const addressKey = address.toLowerCase();
      if (processedTokensRef.current[addressKey]) {
        return;
      }

      // Mark as processed to avoid loops
      processedTokensRef.current[addressKey] = true;

      // Try to resolve from known tokens first
      let token = tokenResolver.fromAddress(address, initialTokens);

      // If token is not found or it's marked as unknown, try to fetch metadata
      if (!token || token.symbol === "Unknown") {
        const fetchedToken = await fetchTokenMetadata(
          address,
          queryParams.tokenASymbol,
          queryParams.tokenBSymbol
        );
        if (fetchedToken) {
          token = fetchedToken;
        }
      }

      if (token) {
        setResolvedTokenB(token);
        onTokenBChange?.(token);
      }
    },
    [
      initialTokens,
      fetchTokenMetadata,
      queryParams.tokenASymbol,
      queryParams.tokenBSymbol,
      onTokenBChange,
    ]
  );

  // Handle token addresses from query params once on mount
  useEffect(() => {
    // Run only once during initial setup
    if (initialSetupCompleteRef.current) {
      return;
    }

    // Process query parameters
    if (queryParams.tokenA) {
      handleTokenAChange(queryParams.tokenA);
    }

    if (queryParams.tokenB) {
      handleTokenBChange(queryParams.tokenB);
    }

    // Mark initial setup as complete
    initialSetupCompleteRef.current = true;
  }, [
    queryParams.tokenA,
    queryParams.tokenB,
    handleTokenAChange,
    handleTokenBChange,
  ]);

  // Handle amount parameters once on mount
  useEffect(() => {
    // Process amounts only once
    if (amountsProcessedRef.current) {
      return;
    }

    // Set amounts from query params if provided
    if (queryParams.amountA && onAmountAChange) {
      console.log(`Setting amountA from query params: ${queryParams.amountA}`);
      onAmountAChange(queryParams.amountA);
    }

    if (queryParams.amountB && onAmountBChange) {
      console.log(`Setting amountB from query params: ${queryParams.amountB}`);
      onAmountBChange(queryParams.amountB);
    }

    amountsProcessedRef.current = true;
  }, [
    queryParams.amountA,
    queryParams.amountB,
    onAmountAChange,
    onAmountBChange,
  ]);

  // Update source from query params for analytics
  useEffect(() => {
    if (queryParams.source) {
      setSource(queryParams.source);

      // Log analytics event if this came from a pool
      if (
        queryParams.source.startsWith("stage_pool-") &&
        typeof window !== "undefined"
      ) {
        console.log(
          `Liquidity provision initiated from pool: ${queryParams.source}`
        );
        // Add analytics event tracking here if needed
      }
    }
  }, [queryParams.source]);

  // Update token symbols from query params if available - but only if symbols don't match
  useEffect(() => {
    // Avoid needless updates by checking current symbol
    if (
      queryParams.tokenASymbol &&
      resolvedTokenA &&
      resolvedTokenA.symbol === "Unknown" &&
      resolvedTokenA.symbol !== queryParams.tokenASymbol
    ) {
      setResolvedTokenA((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          symbol: queryParams.tokenASymbol || prev.symbol,
          name: `${queryParams.tokenASymbol || ""} Token`,
        };
      });
    }

    // Same for tokenB
    if (
      queryParams.tokenBSymbol &&
      resolvedTokenB &&
      resolvedTokenB.symbol === "Unknown" &&
      resolvedTokenB.symbol !== queryParams.tokenBSymbol
    ) {
      setResolvedTokenB((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          symbol: queryParams.tokenBSymbol || prev.symbol,
          name: `${queryParams.tokenBSymbol || ""} Token`,
        };
      });
    }
  }, [
    queryParams.tokenASymbol,
    queryParams.tokenBSymbol,
    resolvedTokenA,
    resolvedTokenB,
  ]);

  return {
    resolvedTokenA,
    resolvedTokenB,
    isLoadingTokens: isLoadingMetadata,
    source,
  };
}
