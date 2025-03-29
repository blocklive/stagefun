import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuthJwt } from "./useAuthJwt";

export function useAuthenticatedSupabase() {
  const { token, isLoading: isTokenLoading, isAuthenticated } = useAuthJwt();
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);

  // Create a new Supabase client
  const createSupabaseClient = useCallback(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    try {
      setIsLoading(true);
      setError(null);

      // Create a basic client with anon key
      const newClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // If we have a token and the user is authenticated, enhance the client
      if (token && isAuthenticated) {
        // Set the auth header for authenticated requests
        newClient.auth.setSession({
          access_token: token,
          refresh_token: "",
        });
      }

      clientRef.current = newClient;
      setClient(newClient);
      setIsLoading(false);
    } catch (err) {
      console.error("Error creating Supabase client:", err);
      setError("Failed to initialize Supabase client");
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Initialize the client on mount
  useEffect(() => {
    // Only create the client if we don't have one yet
    if (!clientRef.current) {
      createSupabaseClient();
    }
  }, [createSupabaseClient]);

  // Update client when token changes
  useEffect(() => {
    // If token changes, update the client
    if (token && isAuthenticated && clientRef.current) {
      clientRef.current.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
    }
  }, [token, isAuthenticated]);

  return {
    supabase: client,
    isLoading: isLoading || isTokenLoading,
    error,
  };
}
