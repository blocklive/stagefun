import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";
import { useContractInteraction } from "../contexts/ContractInteractionContext";

export function useNativeBalance() {
  const { user: privyUser, ready: privyReady } = usePrivy();
  const { getNativeBalance } = useContractInteraction();
  const address = privyUser?.wallet?.address;

  const {
    data: balance,
    error,
    mutate,
  } = useSWR(
    // Only fetch when we have an address and privy is ready
    address && privyReady ? ["native-balance", address] : null,
    async () => {
      try {
        const balance = await getNativeBalance(address!);
        return balance;
      } catch (error) {
        console.error("Error fetching native MON balance:", error);
        return "0";
      }
    },
    {
      refreshInterval: 12000, // Refresh every ~1 block
      revalidateOnFocus: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: "0", // Default value while loading
    }
  );

  return {
    balance: balance ?? "0",
    error,
    isLoading: !error && !balance,
    refresh: () => mutate(),
  };
}
