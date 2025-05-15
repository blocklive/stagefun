import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Token } from "@/types/token";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

interface UseSwapParamsProps {
  allTokens: Token[];
  onInputTokenChange: (token: Token) => void;
  onOutputTokenChange: (token: Token) => void;
}

interface UseSwapParamsResult {
  isLoadingTokens: boolean;
}

export function useSwapParams({
  allTokens,
  onInputTokenChange,
  onOutputTokenChange,
}: UseSwapParamsProps): UseSwapParamsResult {
  const searchParams = useSearchParams();
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const initialSetupCompleteRef = useRef(false);
  const [pendingInputTokenAddress, setPendingInputTokenAddress] = useState<
    string | null
  >(null);
  const [pendingOutputTokenAddress, setPendingOutputTokenAddress] = useState<
    string | null
  >(null);
  const lastProcessedTokensLength = useRef(0);

  // Get query parameters
  const queryParams = {
    inputToken: searchParams.get("inputToken"),
    outputToken: searchParams.get("outputToken"),
  };

  // Find a token by address or symbol
  const findToken = useCallback(
    (addressOrSymbol: string): Token | undefined => {
      if (!addressOrSymbol || !allTokens || allTokens.length === 0)
        return undefined;

      console.log(
        `Searching for token: ${addressOrSymbol} in ${allTokens.length} tokens`
      );

      // Try to find by address first (case insensitive)
      const token = allTokens.find(
        (t) => t.address.toLowerCase() === addressOrSymbol.toLowerCase()
      );

      if (token) {
        console.log(
          `Found token by address: ${token.symbol} (${token.address})`
        );
        return token;
      }

      // If not found by address, try to find by symbol (exact match)
      const tokenBySymbol = allTokens.find((t) => t.symbol === addressOrSymbol);

      if (tokenBySymbol) {
        console.log(
          `Found token by symbol: ${tokenBySymbol.symbol} (${tokenBySymbol.address})`
        );
        return tokenBySymbol;
      }

      console.log(`Token not found: ${addressOrSymbol}`);

      // Log the first few tokens to see what we have in the list
      if (allTokens.length > 0) {
        console.log("Available tokens (first 5):");
        allTokens.slice(0, 5).forEach((t) => {
          console.log(`- ${t.symbol}: ${t.address}`);
        });
      }

      return undefined;
    },
    [allTokens]
  );

  // Process tokens from URL params
  const processTokenParams = useCallback(() => {
    // Store token addresses to try again later if not found
    if (queryParams.inputToken) {
      setPendingInputTokenAddress(queryParams.inputToken);
    }

    if (queryParams.outputToken) {
      setPendingOutputTokenAddress(queryParams.outputToken);
    }

    // Initial processing
    console.log(
      `Processing query params: inputToken=${queryParams.inputToken}, outputToken=${queryParams.outputToken}`
    );
    console.log(`Total available tokens: ${allTokens.length}`);

    // Mark as loading
    setIsLoadingTokens(true);

    try {
      // Process input token parameter
      if (queryParams.inputToken) {
        const inputToken = findToken(queryParams.inputToken);
        if (inputToken) {
          console.log("Setting input token from URL:", inputToken.symbol);
          onInputTokenChange(inputToken);
          setPendingInputTokenAddress(null); // Clear if found
        } else {
          console.warn(
            `Could not find input token with address ${queryParams.inputToken}, will try again later`
          );
          // Keep pendingInputTokenAddress set
        }
      }

      // Process output token parameter
      if (queryParams.outputToken) {
        const outputToken = findToken(queryParams.outputToken);
        if (outputToken) {
          console.log("Setting output token from URL:", outputToken.symbol);
          onOutputTokenChange(outputToken);
          setPendingOutputTokenAddress(null); // Clear if found
        } else {
          console.warn(
            `Could not find output token with address ${queryParams.outputToken}, will try again later`
          );
          // Keep pendingOutputTokenAddress set
        }
      }

      // Mark initial setup as complete
      initialSetupCompleteRef.current = true;
      lastProcessedTokensLength.current = allTokens.length;
    } finally {
      // End loading state
      setIsLoadingTokens(false);
    }
  }, [
    queryParams.inputToken,
    queryParams.outputToken,
    allTokens,
    findToken,
    onInputTokenChange,
    onOutputTokenChange,
  ]);

  // Handle tokens from query params once on mount
  useEffect(() => {
    if (!allTokens || allTokens.length === 0) {
      return;
    }

    // Initial setup on first load
    if (!initialSetupCompleteRef.current) {
      processTokenParams();
      return;
    }

    // If we have more tokens available than last time, try again with pending tokens
    if (allTokens.length > lastProcessedTokensLength.current) {
      console.log(
        `Token list size changed from ${lastProcessedTokensLength.current} to ${allTokens.length}, checking pending tokens`
      );

      // Try to resolve any pending tokens
      if (pendingInputTokenAddress) {
        const inputToken = findToken(pendingInputTokenAddress);
        if (inputToken) {
          console.log(
            `Found previously missing input token: ${inputToken.symbol}`
          );
          onInputTokenChange(inputToken);
          setPendingInputTokenAddress(null);
        }
      }

      if (pendingOutputTokenAddress) {
        const outputToken = findToken(pendingOutputTokenAddress);
        if (outputToken) {
          console.log(
            `Found previously missing output token: ${outputToken.symbol}`
          );
          onOutputTokenChange(outputToken);
          setPendingOutputTokenAddress(null);
        }
      }

      // Update the last processed token count
      lastProcessedTokensLength.current = allTokens.length;
    }
  }, [
    allTokens,
    findToken,
    onInputTokenChange,
    onOutputTokenChange,
    pendingInputTokenAddress,
    pendingOutputTokenAddress,
    processTokenParams,
  ]);

  return {
    isLoadingTokens,
  };
}
