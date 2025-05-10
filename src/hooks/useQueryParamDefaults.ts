import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

interface QueryParamDefaultsResult {
  tokenA: string | null;
  tokenASymbol: string | null;
  tokenB: string | null;
  tokenBSymbol: string | null;
  amountA: string | null;
  amountB: string | null;
  source: string | null;
}

/**
 * Custom hook to handle query parameters for pre-filled form values
 * Common across AMMs for direct linking with populated values
 *
 * Simplified to just extract and return query parameters without callbacks
 * to avoid circular dependencies and render loops
 */
export function useQueryParamDefaults(): QueryParamDefaultsResult {
  // Always call useSearchParams unconditionally (hooks rule)
  const searchParams = useSearchParams();

  // Use useMemo to compute the result based on searchParams
  return useMemo(() => {
    if (!searchParams) {
      // Return empty values if searchParams is not available
      return {
        tokenA: null,
        tokenASymbol: null,
        tokenB: null,
        tokenBSymbol: null,
        amountA: null,
        amountB: null,
        source: null,
      };
    }

    // Extract query parameters
    const tokenA = searchParams.get("tokenA");
    const tokenASymbol = searchParams.get("tokenASymbol");
    const tokenB = searchParams.get("tokenB");
    const tokenBSymbol = searchParams.get("tokenBSymbol");
    const amountA = searchParams.get("amountA");
    const amountB = searchParams.get("amountB");
    const source = searchParams.get("source");

    return {
      tokenA,
      tokenASymbol,
      tokenB,
      tokenBSymbol,
      amountA,
      amountB,
      source,
    };
  }, [searchParams]);
}
