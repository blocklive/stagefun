import { useSupabase } from "@/contexts/SupabaseContext";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { ALPHA_MODE_CACHE_KEY } from "./useAlphaMode";

/**
 * Simplified hook to just check if alpha mode is enabled
 * Checks the user's profile setting in the database
 * Uses SWR for caching to ensure consistency across the app
 */
export function useAlphaModeValue(): boolean {
  const { dbUser, isLoadingUser } = useSupabase();

  // Use SWR for caching the alpha mode state
  const { data: isAlphaMode } = useSWR(
    ALPHA_MODE_CACHE_KEY,
    () => !!dbUser?.alpha_mode,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshWhenHidden: false,
      dedupingInterval: 1000, // Only revalidate once per second at most
    }
  );

  // Fallback to direct state if SWR data isn't available yet
  const [localAlphaMode, setLocalAlphaMode] = useState(false);

  useEffect(() => {
    if (!isLoadingUser) {
      // Set alpha mode based on user's database setting
      setLocalAlphaMode(!!dbUser?.alpha_mode);
    }
  }, [dbUser, isLoadingUser]);

  // Use SWR data if available, otherwise use local state
  return isAlphaMode ?? localAlphaMode;
}
