// Define types inline to avoid import issues
export interface AssetQuantity {
  int: string;
  decimals: number;
  float: number;
  numeric: string;
}

export interface AssetAttributes {
  name: string;
  position_type: string;
  quantity: AssetQuantity;
  value: number | null;
  price: number;
  isVerified?: boolean;
  [key: string]: any; // Allow other properties
}

export interface Asset {
  type: string;
  id: string;
  attributes: AssetAttributes;
  relationships: any;
}

export interface WalletAssetsResponse {
  links: { self: string };
  data: Asset[];
}

/**
 * ZerionSDK - A client-side SDK for interacting with the Zerion API
 */
export class ZerionSDK {
  private apiKey: string;
  private useProxy: boolean;
  private isBrowser: boolean;

  /**
   * Create a new ZerionSDK instance
   * @param apiKey Zerion API key
   * @param useProxy Whether to use the proxy endpoint (recommended for browser usage)
   */
  constructor(apiKey: string, useProxy?: boolean) {
    if (!apiKey) {
      throw new Error("Zerion API key is required");
    }

    this.apiKey = apiKey;
    this.isBrowser = typeof window !== "undefined";

    // Force proxy usage in browser environment for security
    // Only allow direct API calls in server environments
    this.useProxy = this.isBrowser ? true : useProxy !== false;
  }

  /**
   * Get the authorization header for Zerion API requests
   */
  private getAuthHeader(): string {
    // Check if running in browser or Node.js
    if (this.isBrowser) {
      // Browser environment - should never expose the API key
      throw new Error(
        "Direct API calls with auth headers are not allowed in browser environments"
      );
    } else {
      // Node.js environment
      return `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`;
    }
  }

  /**
   * Get the appropriate X-Env header based on the chain ID
   */
  private getEnvHeader(chainId: string): string {
    return chainId.includes("test") ? "testnet" : "mainnet";
  }

  /**
   * Get all assets for a wallet address
   * @param address The wallet address
   * @param chainId Optional chain ID to filter assets (default: "monad-test-v2")
   * @param options Additional query options
   * @returns Promise resolving to wallet assets
   */
  async getWalletAssets(
    address: string,
    chainId: string = "monad-test-v2",
    options: {
      onlySimple?: boolean;
      currency?: string;
      onlyNonTrash?: boolean;
      sort?: string;
    } = {}
  ): Promise<WalletAssetsResponse> {
    if (!address) {
      throw new Error("Wallet address is required");
    }

    const {
      onlySimple = true,
      currency = "usd",
      onlyNonTrash = true,
      sort = "value",
    } = options;

    try {
      let response;

      if (this.useProxy) {
        // Use our proxy endpoint
        const queryParams = new URLSearchParams();
        queryParams.append("address", address);
        queryParams.append("chainId", chainId);
        queryParams.append("currency", currency);
        queryParams.append("sort", sort);
        queryParams.append("onlySimple", onlySimple.toString());
        queryParams.append("onlyNonTrash", onlyNonTrash.toString());

        const url = `/api/zerion/assets?${queryParams.toString()}`;
        response = await fetch(url);
      } else {
        // Direct API call (only available in server contexts)
        if (this.isBrowser) {
          throw new Error(
            "Direct API calls are not allowed in browser environments"
          );
        }

        const queryParams = new URLSearchParams();
        if (onlySimple) queryParams.append("filter[positions]", "only_simple");
        if (currency) queryParams.append("currency", currency);
        if (chainId) queryParams.append("filter[chain_ids]", chainId);
        if (sort) queryParams.append("sort", sort);
        // Add a random cache-busting parameter
        queryParams.append("_cb", Math.random().toString());

        const url = `https://api.zerion.io/v1/wallets/${address}/positions/?${queryParams.toString()}`;
        response = await fetch(url, {
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
            "X-Env": this.getEnvHeader(chainId),
            // Add standard cache control headers for good measure
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            Pragma: "no-cache",
          },
        });
        console.log("Direct API Response Status:", response.status);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zerion API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching wallet assets from Zerion:", error);
      throw error;
    }
  }

  /**
   * Get native token balance for a wallet address
   * @param address The wallet address
   * @param chainId Chain ID (default: "monad-test-v2")
   * @returns Promise resolving to the native token balance
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

      const url = `/api/zerion/balance?${queryParams.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zerion API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.balance || "0";
    } else {
      // Use the full assets API and extract the native balance
      const response = await this.getWalletAssets(address, chainId);
      const nativePosition = response.data?.find(
        (position: Asset) => position.id === `base-${chainId}-asset-asset`
      );

      return nativePosition?.attributes?.quantity?.float?.toString() || "0";
    }
  }

  /**
   * Calculate the total value of all assets in a wallet
   * @param address The wallet address
   * @param chainId Chain ID (default: "monad-test-v2")
   * @returns Promise resolving to the total value in USD
   */
  async getTotalWalletValue(
    address: string,
    chainId: string = "monad-test-v2"
  ): Promise<number> {
    const response = await this.getWalletAssets(address, chainId);
    return (
      response.data?.reduce(
        (sum: number, asset: Asset) => sum + (asset.attributes.value || 0),
        0
      ) || 0
    );
  }
}
