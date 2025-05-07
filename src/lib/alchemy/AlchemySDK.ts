import { ethers } from "ethers";

// Define token types based on Alchemy API responses
export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string | null;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

export interface TokenWithBalance {
  contractAddress: string;
  tokenBalance: string;
  metadata?: TokenMetadata;
  value?: number;
  formattedBalance?: string;
  isNative?: boolean;
}

export interface WalletTokensResponse {
  tokens: TokenWithBalance[];
  totalValue: number;
}

/**
 * AlchemySDK - A client-side SDK for interacting with the Alchemy API
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
   * Get the Alchemy base URL for a given chain ID
   */
  private getAlchemyBaseUrl(chainId: string): string {
    switch (chainId) {
      case "eth-mainnet":
        return "https://eth-mainnet.g.alchemy.com/v2";
      case "eth-sepolia":
        return "https://eth-sepolia.g.alchemy.com/v2";
      case "polygon-mainnet":
        return "https://polygon-mainnet.g.alchemy.com/v2";
      case "polygon-mumbai":
        return "https://polygon-mumbai.g.alchemy.com/v2";
      case "opt-mainnet":
        return "https://opt-mainnet.g.alchemy.com/v2";
      case "arb-mainnet":
        return "https://arb-mainnet.g.alchemy.com/v2";
      case "monad-test-v2":
        return "https://monad-testnet.g.alchemy.com/v2";
      default:
        return "https://eth-mainnet.g.alchemy.com/v2";
    }
  }

  /**
   * Get token balances for a wallet address
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
        response = await fetch(url);
      } else {
        // This would be for direct API calls in server environments
        // Implement if needed
        throw new Error("Direct API calls not implemented");
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
   * @param address The wallet address
   * @param chainId Chain ID (default: "monad-test-v2")
   * @returns Promise resolving to the native token balance in ETH units (as a string)
   */
  async getNativeBalance(
    address: string,
    chainId: string = "monad-test-v2"
  ): Promise<string> {
    if (this.useProxy) {
      // Use our proxy endpoint for balance
      const queryParams = new URLSearchParams();
      queryParams.append("address", address);
      queryParams.append("chainId", chainId);
      queryParams.append("native", "true");
      // Add a cache-busting parameter
      queryParams.append("_cb", Math.random().toString());

      const url = `/api/alchemy/balance?${queryParams.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Alchemy API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.balance || "0";
    } else {
      // Use the full tokens API and extract the native balance
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
  }

  /**
   * Calculate the total value of all tokens in a wallet
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
