import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useSupabase } from "@/contexts/SupabaseContext";

// Create a hook that returns an authenticated Supabase client
export const useAuthenticatedSupabase = () => {
  const { dbUser } = useSupabase();
  const [supabase, setSupabase] = useState<ReturnType<
    typeof createClient
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Setup an authenticated Supabase client
    const setupClient = async () => {
      try {
        setIsLoading(true);

        // Log whether we have a dbUser
        console.log(
          "Setting up authenticated Supabase client. User available:",
          !!dbUser
        );

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

        // In development mode, use service role for testing when available
        if (
          process.env.NODE_ENV === "development" &&
          window.localStorage.getItem("use_service_role") === "true"
        ) {
          console.log("DEV MODE: Using service role for testing");
          // This will be a no-op in production as the service role key won't be available
          const serviceRoleKey = localStorage.getItem("supabase_service_role");
          if (serviceRoleKey) {
            const adminClient = createClient(supabaseUrl, serviceRoleKey, {
              auth: { persistSession: false },
            });
            setSupabase(adminClient);
            setIsLoading(false);
            return;
          }
        }

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
