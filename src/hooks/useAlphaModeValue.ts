import { useSupabase } from "@/contexts/SupabaseContext";
import { useState, useEffect } from "react";

/**
 * Simplified hook to just check if alpha mode is enabled
 * Checks the user's profile setting in the database
 */
export function useAlphaModeValue(): boolean {
  const { dbUser, isLoadingUser } = useSupabase();
  const [isAlphaMode, setIsAlphaMode] = useState(false);

  useEffect(() => {
    if (!isLoadingUser) {
      // Set alpha mode based on user's database setting
      setIsAlphaMode(!!dbUser?.alpha_mode);
    }
  }, [dbUser, isLoadingUser]);

  return isAlphaMode;
}
