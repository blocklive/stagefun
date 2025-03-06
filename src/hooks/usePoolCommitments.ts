import useSWR from "swr";
import { ethers } from "ethers";
import {
  getStageDotFunPoolContract,
  getPoolId,
} from "../lib/contracts/StageDotFunPool";
import { supabase } from "../lib/supabase";

export function usePoolCommitments(poolName: string | null) {
  const {
    data: commitmentData,
    error,
    mutate: refreshCommitments,
  } = useSWR(
    poolName ? ["pool-commitments", poolName] : null,
    async () => {
      if (!poolName) return null;

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
          ? "https://testnet-rpc.monad.xyz"
          : "https://sepolia.base.org"
      );

      // Get pool info from both blockchain and database
      const [poolInfo, { data: dbPool }] = await Promise.all([
        getStageDotFunPoolContract(provider).getPool(getPoolId(poolName)),
        supabase
          .from("pools")
          .select("target_amount")
          .eq("name", poolName)
          .single(),
      ]);

      return {
        totalCommitted: Number(ethers.formatUnits(poolInfo.totalDeposits, 6)), // USDC has 6 decimals
        targetAmount: dbPool?.target_amount || 0,
      };
    },
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  return {
    totalCommitted: commitmentData?.totalCommitted || 0,
    targetAmount: commitmentData?.targetAmount || 0,
    isLoading: !error && !commitmentData,
    error,
    refresh: refreshCommitments,
  };
}
