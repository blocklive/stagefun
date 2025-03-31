import { useState, useEffect } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useSupabase } from "@/contexts/SupabaseContext";

// Create a hook that returns an authenticated Supabase client
export const useAuthenticatedSupabase = () => {
  const { dbUser } = useSupabase();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Setup an authenticated Supabase client
    const setupClient = async () => {
      try {
        setIsLoading(true);

        // Create a new Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
        const supabaseAnonKey = process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

        const client = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
          },
          // Add global headers for debugging
          global: {
            headers: {
              "x-client-info": "client-side-auth",
            },
          },
        });

        setSupabase(client);
      } catch (error) {
        console.error("Error setting up Supabase client:", error);
      } finally {
        setIsLoading(false);
      }
    };

    setupClient();
  }, [dbUser]);

  return {
    supabase,
    isLoading,
  };
};
