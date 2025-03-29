import { useState, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Hook to manage authentication for Supabase using Privy's access token
 */
export function useAuthJwt() {
  const { user, ready, authenticated, getAccessToken } = usePrivy();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh the token
  const refreshToken = useCallback(async () => {
    if (!authenticated || !user) {
      setToken(null);
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get fresh token from Privy
      const accessToken = await getAccessToken();
      setToken(accessToken);

      return accessToken;
    } catch (err) {
      console.error("Error getting Privy access token:", err);
      setError("Failed to get access token");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, user, getAccessToken]);

  // Initialize token when authentication state changes
  useEffect(() => {
    if (ready) {
      refreshToken();
    }
  }, [ready, authenticated, refreshToken]);

  return {
    token,
    isLoading,
    error,
    refreshToken,
    privyReady: ready,
    isAuthenticated: authenticated,
  };
}
