import { useState, useEffect, useCallback } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuthJwt } from "./useAuthJwt";

export function useAuthenticatedSupabase() {
  const { token, isLoading: isTokenLoading, isAuthenticated } = useAuthJwt();
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a new Supabase client with the JWT
  const createSupabaseClient = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setClient(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Initialize Supabase client with environment variables and custom headers
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Create client with auth header that includes the Privy token
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            // We'll use a custom header to send the Privy token
            // This will be used in our API to identify the authenticated user
            Authorization: `Bearer ${token}`,
          },
        },
      });

      console.log("Created Supabase client with custom headers");
      setClient(authClient);
    } catch (error) {
      console.error("Error initializing Supabase client:", error);
      setError("Failed to initialize Supabase client");
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Create or update the client when the token changes
  useEffect(() => {
    if (!isTokenLoading) {
      createSupabaseClient();
    }
  }, [token, isTokenLoading, createSupabaseClient]);

  return {
    supabase: client,
    isLoading: isLoading || isTokenLoading,
    error,
  };
}
