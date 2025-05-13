import { useSupabase } from "@/contexts/SupabaseContext";
import { useCallback, useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

// Key for the alpha mode cache
export const ALPHA_MODE_CACHE_KEY = "alpha-mode-state";

/**
 * Hook to check if alpha mode is enabled via the user's profile setting
 */
export function useAlphaMode(): {
  isAlphaMode: boolean;
  isLoading: boolean;
  toggleAlphaMode: () => Promise<void>;
} {
  const { dbUser, isLoadingUser, refreshUser } = useSupabase();
  const { getAccessToken } = usePrivy();
  const [isAlphaMode, setIsAlphaMode] = useState(false);

  // Update local state whenever dbUser changes
  useEffect(() => {
    if (dbUser) {
      setIsAlphaMode(!!dbUser.alpha_mode);
    }
  }, [dbUser]);

  // Toggle function that updates local state immediately and then syncs with DB
  const toggleAlphaMode = useCallback(async () => {
    if (!dbUser) return;

    // Immediately toggle local state for responsive UI
    const newValue = !isAlphaMode;
    setIsAlphaMode(newValue);

    try {
      // Get auth token from Privy
      const token = await getAccessToken();
      if (!token) {
        console.error("Failed to get authentication token");
        // Revert if authentication fails
        setIsAlphaMode(!newValue);
        return;
      }

      // Call API to update DB
      const response = await fetch("/api/user/alpha-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Success! Refresh user data to keep everything in sync
        refreshUser();
      } else {
        // Revert on failure
        console.error("Failed to toggle alpha mode:", result.error);
        setIsAlphaMode(!newValue);
      }
    } catch (error) {
      // Revert on error
      console.error("Error toggling alpha mode:", error);
      setIsAlphaMode(!newValue);
    }
  }, [dbUser, isAlphaMode, getAccessToken, refreshUser]);

  return {
    isAlphaMode,
    isLoading: isLoadingUser,
    toggleAlphaMode,
  };
}
