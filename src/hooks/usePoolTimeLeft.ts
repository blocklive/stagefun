import useSWR from "swr";
import { ethers } from "ethers";
import {
  getStageDotFunPoolContract,
  getPoolId,
} from "../lib/contracts/StageDotFunPool";

export function usePoolTimeLeft(poolName: string | null) {
  const {
    data: timeData,
    error,
    mutate: refreshTime,
  } = useSWR(
    poolName ? ["pool-time-left", poolName] : null,
    async () => {
      if (!poolName) return null;

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
          ? "https://testnet-rpc.monad.xyz"
          : "https://sepolia.base.org"
      );

      // Get pool info from the blockchain
      const poolInfo = await getStageDotFunPoolContract(provider).getPool(
        getPoolId(poolName)
      );

      const endTime = Number(poolInfo.endTime) * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeLeft = Math.max(0, endTime - now);

      // Calculate days, hours, minutes, seconds
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      return {
        days,
        hours,
        minutes,
        seconds,
        endTime,
        hasEnded: timeLeft <= 0,
      };
    },
    {
      refreshInterval: 1000, // Update every second
      revalidateOnFocus: true,
      dedupingInterval: 500,
    }
  );

  return {
    days: timeData?.days || 0,
    hours: timeData?.hours || 0,
    minutes: timeData?.minutes || 0,
    seconds: timeData?.seconds || 0,
    endTime: timeData?.endTime || 0,
    hasEnded: timeData?.hasEnded || false,
    isLoading: !error && !timeData,
    error,
    refresh: refreshTime,
  };
}
