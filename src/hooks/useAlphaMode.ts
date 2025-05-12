import { useSupabase } from "@/contexts/SupabaseContext";
import { useState, useEffect, useCallback } from "react";
import { mutate } from "swr";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Hook to check if alpha mode is enabled via the user's profile setting
 */
export function useAlphaMode(): {
  isAlphaMode: boolean;
  isLoading: boolean;
  toggleAlphaMode: () => Promise<void>;
} {
  const { dbUser, isLoadingUser } = useSupabase();
  const { getAccessToken } = usePrivy();
  const [isLoading, setIsLoading] = useState(true);
  const [isAlphaMode, setIsAlphaMode] = useState(false);

  // Check if the user has alpha mode enabled in their profile
  useEffect(() => {
    if (!isLoadingUser) {
      setIsAlphaMode(!!dbUser?.alpha_mode);
      setIsLoading(false);
    }
  }, [dbUser, isLoadingUser]);

  // Function to toggle alpha mode
  const toggleAlphaMode = useCallback(async () => {
    if (!dbUser) return;

    setIsLoading(true);
    try {
      // Get auth token from Privy
      const token = await getAccessToken();

      if (!token) {
        console.error("Failed to get authentication token");
        return;
      }

      const response = await fetch("/api/user/alpha-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: !isAlphaMode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsAlphaMode(!isAlphaMode);
        // Update the cached user data
        mutate("api-user-profile");
      } else {
        console.error("Failed to toggle alpha mode:", result.error);
      }
    } catch (error) {
      console.error("Error toggling alpha mode:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dbUser, isAlphaMode, getAccessToken]);

  return { isAlphaMode, isLoading, toggleAlphaMode };
}
