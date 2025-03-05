import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { contractService } from "@/lib/services/contract-service";
import { poolService } from "@/lib/services/pool-service";
import { useSupabase } from "@/contexts/SupabaseProvider";
import { ethers } from "ethers";

export function usePoolInteraction() {
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const { dbUser } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = async (poolId: string, amount: number) => {
    if (!privyUser?.wallet?.address) {
      throw new Error("Please connect your wallet first");
    }

    const wallet = wallets[0];
    if (!wallet) {
      throw new Error("No wallet available");
    }

    try {
      setIsLoading(true);
      setError(null);

      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();

      const { receipt, lpTokenAddress } =
        await contractService.depositToPoolOnChain(signer, poolId, amount);

      // Return transaction details that the existing UI expects
      return {
        hash: receipt.transactionHash,
        lpTokenAddress,
        wait: async () => receipt,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to deposit";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    deposit,
    isLoading,
    error,
  };
}
