import { ethers } from "ethers";

// Define token types based on Alchemy API responses
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

export interface TokenWithBalance {
  contractAddress: string | null;
  tokenBalance: string;
  metadata?: TokenMetadata;
  value?: number;
  formattedBalance?: string;
  isNative?: boolean;
  isOfficialWmon?: boolean;
}

export interface WalletTokensResponse {
  tokens: TokenWithBalance[];
  totalValue: number;
  metadata?: {
    totalTokens: number;
    pagesRetrieved: number;
    hasMorePages: boolean;
  };
}

/**
 * AlchemySDK - A client-side SDK for interacting with the Alchemy API
 * This version uses the Portfolio API for efficient token data retrieval
 */
export class AlchemySDK {
  private apiKey: string;
  private useProxy: boolean;
  private isBrowser: boolean;

  /**
   * Create a new AlchemySDK instance
   * @param apiKey Alchemy API key
   * @param useProxy Whether to use the proxy endpoint (recommended for browser usage)
   */
  constructor(apiKey: string, useProxy?: boolean) {
    if (!apiKey) {
      throw new Error("Alchemy API key is required");
    }

    this.apiKey = apiKey;
    this.isBrowser = typeof window !== "undefined";

    // Force proxy usage in browser environment for security
    // Only allow direct API calls in server environments
    this.useProxy = this.isBrowser ? true : useProxy !== false;
  }

  /**
   * Get token balances for a wallet address using the Alchemy Portfolio API
   * This is more efficient than multiple RPC calls to separate endpoints
   *
   * @param address The wallet address
   * @param chainId Chain ID (default: "monad-test-v2")
   * @returns Promise resolving to wallet tokens
   */
  async getWalletTokens(
    address: string,
    chainId: string = "monad-test-v2"
  ): Promise<WalletTokensResponse> {
    if (!address) {
      throw new Error("Wallet address is required");
    }

    try {
      let response;

      if (this.useProxy) {
        // Use our proxy endpoint
        const queryParams = new URLSearchParams();
        queryParams.append("address", address);
        queryParams.append("chainId", chainId);
        // Add a cache-busting parameter
        queryParams.append("_cb", Math.random().toString());

        const url = `/api/alchemy/tokens?${queryParams.toString()}`;
        console.log(`Fetching tokens from ${url}`);
        response = await fetch(url);
      } else {
        // Direct API calls not supported for security reasons
        throw new Error("Direct API calls not implemented in client SDK");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Alchemy API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching wallet tokens from Alchemy:", error);
      throw error;
    }
  }

  /**
   * Get native token balance for a wallet address
   * This is now just a convenience method that extracts native balance from getWalletTokens
   *
   * @param address The wallet address
   * @param chainId Chain ID (default: "monad-test-v2")
   * @returns Promise resolving to the native token balance
   */
  async getNativeBalance(
    address: string,
    chainId: string = "monad-test-v2"
  ): Promise<string> {
    // Get all tokens and extract the native token
    const response = await this.getWalletTokens(address, chainId);
    const nativeToken = response.tokens?.find((token) => token.isNative);

    if (nativeToken?.formattedBalance) {
      return nativeToken.formattedBalance;
    }

    // If we have the native balance in wei, convert it to ETH
    if (nativeToken?.tokenBalance) {
      return ethers.formatEther(nativeToken.tokenBalance);
    }

    return "0";
  }

  /**
   * Calculate the total value of all tokens in a wallet
   * Now using the totalValue from the API response which includes price data
   *
   * @param address The wallet address
   * @param chainId Chain ID (default: "monad-test-v2")
   * @returns Promise resolving to the total value in USD
   */
  async getTotalWalletValue(
    address: string,
    chainId: string = "monad-test-v2"
  ): Promise<number> {
    const response = await this.getWalletTokens(address, chainId);
    return response.totalValue || 0;
  }
}
