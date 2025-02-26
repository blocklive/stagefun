import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function useAuthenticatedSupabase() {
  const { ready, authenticated, user } = usePrivy();
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initClient() {
      if (!ready || !authenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Create a standard client with global headers
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              "x-privy-user-id": user.id,
              "x-privy-wallet-address": user.wallet?.address || "",
            },
          },
        });

        console.log("Created Supabase client with custom headers");
        setClient(authClient);
      } catch (error) {
        console.error("Error initializing Supabase client:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initClient();
  }, [ready, authenticated, user]);

  return { client, isLoading };
}
