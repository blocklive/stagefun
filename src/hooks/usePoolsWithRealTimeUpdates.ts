import useSWR from "swr";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getAllPools } from "../lib/services/pool-service";
import { Pool } from "../lib/supabase";

export function usePoolsWithRealTimeUpdates() {
  const {
    data: pools,
    error,
    mutate,
  } = useSWR("pools", getAllPools, {
    refreshInterval: 5000, // Refresh every 5 seconds
    revalidateOnFocus: true,
  });

  useEffect(() => {
    // Subscribe to real-time changes
    const subscription = supabase
      .channel("pools_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pools",
        },
        () => {
          // Revalidate the cache when we get any pool updates
          mutate();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [mutate]);

  return {
    pools: pools || [],
    isLoading: !error && !pools,
    error,
    refresh: mutate,
  };
}
