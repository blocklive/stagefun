import useSWR from "swr";
import { ethers } from "ethers";
import {
  getPoolContract,
  getStageDotFunLiquidityContract,
} from "../lib/contracts/StageDotFunPool";
import { useContractInteraction } from "./useContractInteraction";
import { usePrivy } from "@privy-io/react-auth";

export interface PoolCommitment {
  user: string;
  amount: bigint;
  verified: boolean;
}

export function usePoolCommitments(poolAddress: string | null) {
  const { getProvider } = useContractInteraction();
  const { user: privyUser } = usePrivy();
  const walletAddress = privyUser?.wallet?.address;

  const {
    data: commitments,
    error,
    isValidating,
    mutate,
  } = useSWR(
    // Only fetch when we have a pool address and wallet address
    poolAddress && walletAddress
      ? ["pool-commitments", poolAddress, walletAddress]
      : null,
    async () => {
      console.log("Fetching commitments for pool:", poolAddress);

      try {
        console.log("Getting provider...");
        const provider = await getProvider();
        console.log("Provider obtained:", provider);

        console.log("Getting pool contract for address:", poolAddress);
        const pool = getPoolContract(provider, poolAddress!);
        console.log("Pool contract obtained:", pool);

        // Get the LP token address from the pool
        console.log("Getting LP token address...");
        const lpTokenAddress = await pool.lpToken();
        console.log("LP token address:", lpTokenAddress);

        // Get the LP token contract
        console.log("Getting LP token contract...");
        const lpToken = getStageDotFunLiquidityContract(
          provider,
          lpTokenAddress
        );
        console.log("LP token contract obtained:", lpToken);

        // We'll still return an array of commitments for compatibility
        const commitmentsData: PoolCommitment[] = [];

        console.log("Checking balance for wallet:", walletAddress);
        try {
          const balance = await lpToken.balanceOf(walletAddress);
          console.log(
            "LP token balance for wallet:",
            walletAddress,
            "is",
            balance.toString()
          );

          if (balance > BigInt(0)) {
            commitmentsData.push({
              user: walletAddress!,
              amount: balance,
              verified: true,
            });
          }
        } catch (balanceError) {
          console.error(
            "Error fetching LP token balance for wallet:",
            walletAddress,
            balanceError
          );
        }

        console.log("All commitments data:", commitmentsData);
        return commitmentsData;
      } catch (err) {
        console.error("Error fetching commitments:", err);
        throw err;
      }
    },
    {
      refreshInterval: 15000, // Refresh every ~1 block
      revalidateOnFocus: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: [], // Default empty array while loading
    }
  );

  return {
    commitments: commitments || [],
    loading: isValidating && !commitments,
    error,
    refresh: () => mutate(),
  };
}
