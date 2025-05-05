export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  source?: TokenSource;
  isCustom?: boolean;
  lastUsed?: number;
  hasLiquidity?: boolean;
}

export type TokenSource = "core" | "platform" | "custom" | "recent";

export interface TokenListResponse {
  name: string;
  timestamp: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  tokens: Token[];
}

export interface PoolToken {
  address: string;
  symbol: string;
  name?: string;
  decimals?: number;
  logoURI?: string;
}
