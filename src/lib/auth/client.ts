import { useState, useEffect } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuthJwt } from "@/hooks/useAuthJwt";

// Global token access function
let globalTokenAccess: (() => Promise<string>) | null = null;

/**
 * Setup global access to Privy token
 *
 * @param getToken Function to get the Privy token
 */
export function setupGlobalPrivyTokenAccess(getToken: () => Promise<string>) {
  globalTokenAccess = getToken;
}

/**
 * Get auth headers with Privy token
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  if (!globalTokenAccess) {
    throw new Error(
      "Token access not set up. Call setupGlobalPrivyTokenAccess first."
    );
  }

  try {
    const token = await globalTokenAccess();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  } catch (error) {
    console.error("Failed to get auth token:", error);
    throw error;
  }
}

/**
 * Hook to manage authentication token from Privy
 * This is a wrapper around useAuthJwt to maintain backward compatibility
 * @deprecated Use useAuthJwt directly from @/hooks/useAuthJwt
 */
export function useAuthToken() {
  const {
    token,
    isLoading: loading,
    error,
    refreshToken,
    isAuthenticated,
  } = useAuthJwt();

  return {
    token,
    loading,
    error,
    refreshToken,
    isAuthenticated,
  };
}

/**
 * Hook to create an authenticated Supabase client
 * @deprecated Use useAuthenticatedSupabase from @/hooks/useAuthenticatedSupabase
 */
export function useAuthenticatedSupabaseClient() {
  const { token } = useAuthToken();
  const [client, setClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if (!token) {
      setClient(null);
      return;
    }

    console.warn(
      "useAuthenticatedSupabaseClient is deprecated. Use useAuthenticatedSupabase from @/hooks/useAuthenticatedSupabase"
    );

    // Create Supabase client with custom auth
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    setClient(supabaseClient);
  }, [token]);

  return { client, isAuthenticated: !!client };
}
