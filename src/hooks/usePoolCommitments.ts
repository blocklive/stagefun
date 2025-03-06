import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  getPoolContract,
  getStageDotFunPoolFactoryContract,
} from "../lib/contracts/StageDotFunPool";
import { useContractInteraction } from "./useContractInteraction";

export interface PoolCommitment {
  user: string;
  amount: bigint;
  verified: boolean;
}

export function usePoolCommitments(poolAddress: string | null) {
  const { getProvider } = useContractInteraction();
  const [commitments, setCommitments] = useState<PoolCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCommitments() {
      if (!poolAddress) {
        setLoading(false);
        return;
      }

      try {
        const provider = await getProvider();
        const pool = getPoolContract(provider, poolAddress);
        const lpHolders = await pool.getLpHolders();

        // Get balances for each holder
        const commitmentsData = await Promise.all(
          lpHolders.map(async (holder: string) => {
            const balance = await pool.lpBalances(holder);
            return {
              user: holder,
              amount: balance,
              verified: true, // In the new system, all holders are verified
            };
          })
        );

        setCommitments(commitmentsData);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch commitments")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchCommitments();
  }, [poolAddress, getProvider]);

  return {
    commitments,
    loading,
    error,
  };
}
