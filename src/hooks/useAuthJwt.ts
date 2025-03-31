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
      console.log("refreshToken: Not authenticated or no user available");
      setToken(null);
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get fresh token from Privy
      console.log("Fetching fresh token from Privy...");
      const accessToken = await getAccessToken();
      console.log(
        "Token fetched successfully, length:",
        accessToken?.length || 0
      );
      if (accessToken) {
        console.log("Token begins with:", accessToken.substring(0, 10) + "...");
      }
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

        // Debug info
        console.log("Auth token fetched, length:", token?.length || 0);
        if (token && token.length > 0) {
          // Log first 10 chars for debugging
          console.log("Token starts with:", token.substring(0, 10) + "...");
        }

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
