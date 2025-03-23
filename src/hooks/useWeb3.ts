import { useWalletClient, usePublicClient } from "wagmi";
import { useMemo } from "react";
import { BrowserProvider } from "ethers";

export function useProvider() {
  const publicClient = usePublicClient();

  const provider = useMemo(() => {
    if (!publicClient) return null;
    return new BrowserProvider(publicClient as any);
  }, [publicClient]);

  return { provider };
}

export function useSigner() {
  const { data: walletClient } = useWalletClient();

  const signer = useMemo(() => {
    if (!walletClient) return null;
    return new BrowserProvider(walletClient as any).getSigner();
  }, [walletClient]);

  return { signer };
}
