/**
 * TokenInfo interface representing a token's metadata
 */
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  isCustom?: boolean;
}

/**
 * Token balance information
 */
export interface TokenBalance extends TokenInfo {
  balance: string;
  balanceRaw: bigint;
}
