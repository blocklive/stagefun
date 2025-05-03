import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { Token } from "@/types/token";
import showToast from "@/utils/toast";

// ERC20 ABI with just the functions we need
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

export function useTokenFetcher() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenData = useCallback(
    async (address: string): Promise<Token | null> => {
      if (!address || !ethers.isAddress(address)) {
        setError("Invalid token address");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use public RPC provider
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL
        );

        // Create contract instance
        const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);

        // Fetch token metadata in parallel
        const [name, symbol, decimals] = await Promise.all([
          tokenContract.name().catch(() => "Unknown Token"),
          tokenContract.symbol().catch(() => "UNKNOWN"),
          tokenContract.decimals().catch(() => 18),
        ]);

        // Use a generic token logo
        const logoURI = "/icons/generic-token.svg";

        const token: Token = {
          address,
          name,
          symbol,
          decimals: Number(decimals),
          logoURI,
          isCustom: true,
          source: "custom",
        };

        return token;
      } catch (err) {
        console.error("Error fetching token data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch token data";
        setError(errorMessage);
        showToast.error(`Failed to fetch token: ${errorMessage}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const validateAndFetchToken = useCallback(
    async (addressInput: string): Promise<Token | null> => {
      // Clean the input - remove spaces, etc.
      const cleanedAddress = addressInput.trim();

      if (!ethers.isAddress(cleanedAddress)) {
        setError("Invalid token address format");
        showToast.error("Invalid token address format");
        return null;
      }

      // Convert to checksum address
      const checksumAddress = ethers.getAddress(cleanedAddress);

      return fetchTokenData(checksumAddress);
    },
    [fetchTokenData]
  );

  return {
    fetchTokenData,
    validateAndFetchToken,
    isLoading,
    error,
  };
}
