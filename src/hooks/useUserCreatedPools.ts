import { useState } from "react";
import useSWR from "swr";
import { Pool } from "../lib/supabase";
import { getUserPools } from "../lib/services/pool-service";

export function useUserCreatedPools(userId: string | null | undefined) {
  // Fetch pools from database
  const {
    data: pools,
    error: dbError,
    isLoading: isDbLoading,
    mutate: refreshPools,
  } = useSWR(
    userId ? ["user-created-pools", userId] : null,
    async () => {
      if (!userId) return [];

      try {
        // Use getUserPools which doesn't make blockchain requests
        const userPools = await getUserPools(userId);

        // Process the pools to remove contract_address and other blockchain-related fields
        // to prevent any component from trying to make blockchain requests
        return userPools.map((pool) => ({
          ...pool,
          // Remove blockchain-related fields by setting them to null or empty strings
          contract_address: null,
          lp_token_address: null,
          blockchain_tx_hash: null,
          blockchain_block_number: null,
          blockchain_status: null,
          blockchain_network: null,
          blockchain_explorer_url: null,
        }));
      } catch (error) {
        console.error("Error fetching user pools:", error);
        return [];
      }
    },
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false, // Don't revalidate on focus to reduce API calls
    }
  );

  return {
    pools: pools || [],
    isLoading: isDbLoading,
    error: dbError,
    refresh: refreshPools,
  };
}
