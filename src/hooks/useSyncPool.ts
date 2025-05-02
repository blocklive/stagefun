import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useSmartWallet } from "./useSmartWallet";
import useSWRMutation from "swr/mutation";
import { StageSwapPairABI } from "../lib/contracts/StageSwap";

export const useSyncPool = (pairAddress: string) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { smartWalletAddress, callContractFunction } = useSmartWallet();

  const syncPool = useCallback(async () => {
    if (!pairAddress || !smartWalletAddress || !callContractFunction) {
      toast.error("Smart wallet not connected");
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading("Syncing pool reserves...");

    try {
      // Call the sync function on the pair contract
      const result = await callContractFunction(
        pairAddress as `0x${string}`,
        StageSwapPairABI,
        "sync",
        [],
        "Sync pool reserves"
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to sync pool reserves");
      }

      toast.success("Pool reserves synced successfully", { id: toastId });
      return result.txHash;
    } catch (error: any) {
      console.error("Error syncing pool:", error);
      toast.error(
        `Error: ${error?.reason || error?.message || "Sync failed"}`,
        { id: toastId }
      );
    } finally {
      setIsSyncing(false);
    }
  }, [pairAddress, smartWalletAddress, callContractFunction]);

  // Setup SWR mutation
  const { trigger, isMutating, error, data } = useSWRMutation(
    ["syncPool", pairAddress, smartWalletAddress],
    syncPool
  );

  return {
    syncPool: trigger,
    isSyncing: isSyncing || isMutating,
    error,
    txHash: data,
  };
};
