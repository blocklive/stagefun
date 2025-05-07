import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { TokenInfo } from "@/types/tokens";

interface TokenMetadataHookResult {
  isLoading: boolean;
  fetchTokenMetadata: (
    address: string,
    tokenASymbol?: string | null,
    tokenBSymbol?: string | null
  ) => Promise<TokenInfo | null>;
  addTokenToList: (token: TokenInfo) => void;
}

/**
 * Custom hook for fetching and managing token metadata
 */
export function useTokenMetadata(
  initialTokenList: TokenInfo[] = []
): TokenMetadataHookResult {
  const [isLoading, setIsLoading] = useState(false);
  const [tokenList, setTokenList] = useState<TokenInfo[]>(initialTokenList);

  // Keep tokenList in sync with initialTokenList changes
  useEffect(() => {
    setTokenList((prev) => {
      // Keep custom tokens but update standard tokens
      const customTokens = prev.filter((t) => t.isCustom);
      const standardTokens = initialTokenList.filter(
        (t) =>
          !customTokens.some(
            (ct) => ct.address.toLowerCase() === t.address.toLowerCase()
          )
      );
      return [...standardTokens, ...customTokens];
    });
  }, [initialTokenList]);

  // Add a token to the list if not already present
  const addTokenToList = useCallback((token: TokenInfo) => {
    setTokenList((prev) => {
      if (
        prev.some(
          (t) => t.address.toLowerCase() === token.address.toLowerCase()
        )
      ) {
        return prev;
      }
      return [...prev, token];
    });
  }, []);

  // Function to fetch token metadata from a contract
  const fetchTokenMetadata = useCallback(
    async (
      tokenAddress: string,
      queryTokenASymbol?: string | null,
      queryTokenBSymbol?: string | null
    ): Promise<TokenInfo | null> => {
      if (!tokenAddress || !tokenAddress.startsWith("0x")) return null;

      try {
        setIsLoading(true);

        // Create a minimal ERC20 interface
        const abi = [
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function decimals() view returns (uint8)",
        ];

        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL
        );

        // Validate address before making contract calls
        if (!ethers.isAddress(tokenAddress)) {
          console.warn("Invalid token address:", tokenAddress);
          return null;
        }

        const tokenContract = new ethers.Contract(tokenAddress, abi, provider);

        // Fetch token details with better error handling for each call
        let name = "Unknown Token";
        let symbol = "UNKNOWN";
        let decimals = 18;

        try {
          name = await tokenContract.name();
        } catch (error) {
          console.warn(`Error fetching token name for ${tokenAddress}:`, error);

          // Use symbol as fallback for name if available from query params
          const isTokenA =
            queryTokenASymbol &&
            tokenAddress.toLowerCase() === tokenAddress.toLowerCase();
          const isTokenB =
            queryTokenBSymbol &&
            tokenAddress.toLowerCase() === tokenAddress.toLowerCase();

          if (isTokenA && queryTokenASymbol) {
            name = `${queryTokenASymbol} Token`;
          } else if (isTokenB && queryTokenBSymbol) {
            name = `${queryTokenBSymbol} Token`;
          }
        }

        try {
          symbol = await tokenContract.symbol();
        } catch (error) {
          console.warn(
            `Error fetching token symbol for ${tokenAddress}:`,
            error
          );

          // Use symbol from query params if available
          const isTokenA =
            queryTokenASymbol &&
            tokenAddress.toLowerCase() === tokenAddress.toLowerCase();
          const isTokenB =
            queryTokenBSymbol &&
            tokenAddress.toLowerCase() === tokenAddress.toLowerCase();

          if (isTokenA && queryTokenASymbol) {
            symbol = queryTokenASymbol;
          } else if (isTokenB && queryTokenBSymbol) {
            symbol = queryTokenBSymbol;
          }
        }

        try {
          decimals = await tokenContract.decimals();
        } catch (error) {
          console.warn(
            `Error fetching token decimals for ${tokenAddress}, defaulting to 18:`,
            error
          );

          // Most tokens use 18 decimals, but LP tokens often follow the base token
          // If it's a liquidity pool token, we can try to determine decimals from the name/symbol
          if (
            symbol.includes("LP") ||
            name.includes("LP") ||
            name.includes("Liquidity")
          ) {
            decimals = 18; // Most LP tokens use 18 decimals
          } else if (
            symbol === "USDC" ||
            symbol === "USDT" ||
            symbol.includes("USD")
          ) {
            decimals = 6; // Stablecoins often use 6 decimals
          }
        }

        // Create token info
        const tokenInfo: TokenInfo = {
          address: tokenAddress,
          name,
          symbol,
          decimals,
          logoURI: "/icons/generic-token.svg",
          isCustom: true,
        };

        // Add to tokenList if not already there
        addTokenToList(tokenInfo);

        return tokenInfo;
      } catch (error) {
        console.error("Error fetching token metadata:", error);

        // Create fallback token with available information from query params
        const isTokenA =
          queryTokenASymbol &&
          tokenAddress.toLowerCase() === tokenAddress.toLowerCase();
        const isTokenB =
          queryTokenBSymbol &&
          tokenAddress.toLowerCase() === tokenAddress.toLowerCase();

        if (isTokenA && queryTokenASymbol) {
          const fallbackToken: TokenInfo = {
            address: tokenAddress,
            name: `${queryTokenASymbol} Token`,
            symbol: queryTokenASymbol,
            decimals: 18, // Default to 18 decimals
            logoURI: "/icons/generic-token.svg",
            isCustom: true,
          };
          addTokenToList(fallbackToken);
          return fallbackToken;
        } else if (isTokenB && queryTokenBSymbol) {
          const fallbackToken: TokenInfo = {
            address: tokenAddress,
            name: `${queryTokenBSymbol} Token`,
            symbol: queryTokenBSymbol,
            decimals: 18, // Default to 18 decimals
            logoURI: "/icons/generic-token.svg",
            isCustom: true,
          };
          addTokenToList(fallbackToken);
          return fallbackToken;
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [addTokenToList]
  );

  return {
    isLoading,
    fetchTokenMetadata,
    addTokenToList,
  };
}
