import useSWR from "swr";
import { ethers } from "ethers";
import { useContractInteraction } from "./useContractInteraction";
import { getStageDotFunLiquidityContract } from "../lib/contracts/StageDotFunPool";

interface LpTokenInfo {
  symbol: string;
  name: string;
  isLoading: boolean;
  error: Error | null;
}

export function useLpTokenInfo(
  lpTokenAddress: string | null | undefined,
  poolName: string,
  poolTicker?: string
): LpTokenInfo {
  const { getProvider } = useContractInteraction();

  // Generate fallback values
  const fallbackSymbol =
    poolTicker ||
    (poolName ? `${poolName.substring(0, 4).toUpperCase()}-LP` : "LP");
  const fallbackName = `${poolName || "Pool"} Liquidity Token`;

  // SWR fetcher function
  const fetcher = async (address: string) => {
    if (!address) {
      throw new Error("No LP token address provided");
    }

    const provider = await getProvider();
    if (!provider) {
      throw new Error("Failed to get provider");
    }

    console.log("Fetching LP token info for address:", address);

    const lpTokenContract = getStageDotFunLiquidityContract(provider, address);

    const [symbol, name] = await Promise.all([
      lpTokenContract.symbol(),
      lpTokenContract.name(),
    ]);

    console.log("LP Token info from contract:", {
      address,
      symbol,
      name,
      poolName,
      poolTicker,
    });

    return {
      symbol: symbol && symbol.trim() !== "" ? symbol : fallbackSymbol,
      name: name && name.trim() !== "" ? name : fallbackName,
    };
  };

  // Use SWR to handle data fetching, caching, and revalidation
  const { data, error, isLoading } = useSWR(
    lpTokenAddress ? ["lpTokenInfo", lpTokenAddress] : null,
    ([_, address]) => fetcher(address),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      fallbackData: {
        symbol: fallbackSymbol,
        name: fallbackName,
      },
    }
  );

  return {
    symbol: data?.symbol || fallbackSymbol,
    name: data?.name || fallbackName,
    isLoading,
    error: error as Error | null,
  };
}
