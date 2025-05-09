import { TokenInfo } from "@/types/tokens";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

/**
 * Utility for resolving token information from addresses or symbols
 * Used to translate query parameters into actual token data
 */
export const tokenResolver = {
  /**
   * Resolve token from address
   * @param address Token address or symbol like "USDC"
   * @param tokenList List of available tokens
   * @param defaultToken Default token to return if not found
   */
  fromAddress: (
    address: string | null,
    tokenList: TokenInfo[],
    defaultToken?: TokenInfo
  ): TokenInfo | undefined => {
    if (!address) return defaultToken;

    // Special case for USDC - check both by symbol and by contract address
    if (
      address === "USDC" ||
      address.toLowerCase() ===
        CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase()
    ) {
      console.log(
        "USDC token requested - ensuring we return the correct USDC token"
      );
      return tokenList.find((t) => t.symbol === "USDC") || defaultToken;
    }

    // Try to find by address
    const token = tokenList.find(
      (t) => t.address.toLowerCase() === address.toLowerCase()
    );

    if (token) return token;

    // If not found, create a synthetic token entry for LP tokens
    // Assuming LP tokens follow our naming convention or are from our pools
    if (address.startsWith("0x")) {
      // Unknown token - create placeholder until we can fetch details
      return {
        address: address,
        symbol: "Unknown", // This will be updated once we fetch token info
        name: "Unknown Token",
        decimals: 18, // Default to 18 decimals, will be corrected when we fetch token info
        logoURI: "/icons/generic-token.svg",
        isCustom: true,
      };
    }

    return defaultToken;
  },

  /**
   * Resolve token from symbol
   * @param symbol Token symbol
   * @param tokenList List of available tokens
   * @param defaultToken Default token to return if not found
   */
  fromSymbol: (
    symbol: string | null,
    tokenList: TokenInfo[],
    defaultToken?: TokenInfo
  ): TokenInfo | undefined => {
    if (!symbol) return defaultToken;

    const token = tokenList.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );

    return token || defaultToken;
  },

  /**
   * Get default USDC token
   * @param tokenList List of available tokens
   */
  getDefaultStablecoin: (tokenList: TokenInfo[]): TokenInfo | undefined => {
    return tokenList.find((t) => t.symbol === "USDC");
  },
};
