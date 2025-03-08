import { useEffect, useState } from "react";
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
  const [commitments, setCommitments] = useState<PoolCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCommitments() {
      console.log("Fetching commitments for pool:", poolAddress);

      if (!poolAddress) {
        console.log("No pool address provided, skipping commitment fetch");
        setLoading(false);
        return;
      }

      try {
        console.log("Getting provider...");
        const provider = await getProvider();
        console.log("Provider obtained:", provider);

        console.log("Getting pool contract for address:", poolAddress);
        const pool = getPoolContract(provider, poolAddress);
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

        // We'll still return an array of commitments for compatibility,
        // but we'll only include the current user's wallet
        const commitmentsData: PoolCommitment[] = [];

        // Get the current user's wallet address
        const walletAddress = privyUser?.wallet?.address;
        console.log("Current user's wallet address:", walletAddress);

        if (walletAddress) {
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
                user: walletAddress,
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
        }

        console.log("All commitments data:", commitmentsData);
        setCommitments(commitmentsData);
      } catch (err) {
        console.error("Error fetching commitments:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to fetch commitments")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchCommitments();
  }, [poolAddress, getProvider, privyUser]);

  return {
    commitments,
    loading,
    error,
  };
}
