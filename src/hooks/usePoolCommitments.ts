import useSWR from "swr";
import { ethers } from "ethers";
import {
  getPoolContract,
  getStageDotFunLiquidityContract,
} from "../lib/contracts/StageDotFunPool";
import { usePrivy } from "@privy-io/react-auth";

export interface PoolCommitment {
  user: string;
  amount: bigint;
  verified: boolean;
}

export function usePoolCommitments(poolAddress: string | null) {
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
        // Use a direct RPC provider instead of the embedded wallet
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
        if (!rpcUrl) {
          throw new Error("RPC URL not configured");
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const pool = getPoolContract(provider, poolAddress!);

        // Get the LP token address from the pool
        const lpTokenAddress = await pool.lpToken();

        // Get the LP token contract
        const lpToken = getStageDotFunLiquidityContract(
          provider,
          lpTokenAddress
        );

        // We'll still return an array of commitments for compatibility
        const commitmentsData: PoolCommitment[] = [];

        try {
          const balance = await lpToken.balanceOf(walletAddress);

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
