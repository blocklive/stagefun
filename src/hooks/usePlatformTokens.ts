import { useState, useEffect, useCallback } from "react";
import { Token } from "@/types/token";
import { createClient } from "@/lib/supabase/client";

interface PoolRecord {
  name: string;
  ticker: string | null;
  lp_token_address: string | null;
  raised_amount: number | null;
}

export function usePlatformTokens({
  onlyWithLiquidity = false,
}: {
  onlyWithLiquidity?: boolean;
} = {}) {
  const [platformTokens, setPlatformTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatformTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Base query to get LP tokens
      let query = supabase
        .from("pools")
        .select("name, ticker, lp_token_address, raised_amount")
        .filter("lp_token_address", "not.is", null)
        .filter("ticker", "not.is", null)
        .filter("display_public", "eq", true);

      // If we only want tokens with liquidity for swapping
      if (onlyWithLiquidity) {
        query = query.filter("raised_amount", "gt", 0);
        // Consider adding other liquidity-related filters here if needed
        // For example, if there's a separate field tracking liquidity specifically
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!data || data.length === 0) {
        setPlatformTokens([]);
        return;
      }

      // Map the results to Token objects
      const tokens: Token[] = data.map((pool: PoolRecord) => ({
        address: pool.lp_token_address!,
        symbol: pool.ticker!,
        name: `${pool.name} LP Token`,
        // Default ERC20 decimals
        decimals: 18,
        // Use a standard LP token logo or generate based on the token symbol
        logoURI: `/icons/lp-token.svg`,
        source: "platform",
        hasLiquidity: Boolean(pool.raised_amount && pool.raised_amount > 0),
      }));

      setPlatformTokens(tokens);
    } catch (err) {
      console.error("Error fetching platform tokens:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch platform tokens";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onlyWithLiquidity]);

  // Fetch platform tokens on mount
  useEffect(() => {
    fetchPlatformTokens();
  }, [fetchPlatformTokens]);

  // Function to refresh the tokens
  const refreshPlatformTokens = useCallback(() => {
    fetchPlatformTokens();
  }, [fetchPlatformTokens]);

  return {
    platformTokens,
    isLoading,
    error,
    refreshPlatformTokens,
  };
}
