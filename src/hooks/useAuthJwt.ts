import { useState, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Hook to manage authentication for Supabase using Privy's access token
 */
export function useAuthJwt() {
  const { user, ready, authenticated, getAccessToken } = usePrivy();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
      setError(err instanceof Error ? err : new Error(String(err)));
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

  useEffect(() => {
    const fetchToken = async () => {
      if (!ready) return;

      try {
        setIsLoading(true);
        const token = await getAccessToken();
        setToken(token);
      } catch (err) {
        console.error("Error fetching JWT token:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [getAccessToken, ready]);

  return {
    token,
    isLoading,
    error,
    refreshToken,
    privyReady: ready,
    isAuthenticated: authenticated,
  };
}
