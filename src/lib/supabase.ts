import { createClient } from "@supabase/supabase-js";
import { usePrivy } from "@privy-io/react-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("Initializing Supabase client with URL:", supabaseUrl);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a function to get a Supabase client with the Privy JWT
export async function getAuthenticatedSupabaseClient() {
  const { getAccessToken } = usePrivy();

  try {
    // Get the Privy JWT
    const privyToken = await getAccessToken();

    if (!privyToken) {
      console.error("No Privy token available");
      return supabase;
    }

    // Create a new Supabase client with the Privy JWT
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${privyToken}`,
        },
      },
    });

    return authClient;
  } catch (error) {
    console.error("Error getting authenticated Supabase client:", error);
    return supabase;
  }
}

// Define types for your database tables
export interface User {
  id: string;
  wallet_address: string;
  name: string;
  email?: string;
  twitter_username?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Pool {
  id: string;
  name: string;
  creator_id: string;
  target_amount: number;
  total_deposits: number;
  revenue_accumulated: number;
  lp_holder_count: number;
  pool_status: "INACTIVE" | "ACTIVE" | "PAUSED" | "CLOSED";
  blockchain_tx_hash: string;
  blockchain_status: "pending" | "confirmed" | "failed";
  blockchain_network: string;
  blockchain_block_number: number;
  blockchain_explorer_url: string;
  lp_token_address: string;
  created_at: string;
  creator?: User;
  lp_holders?: PoolLpHolder[];
}

export interface PoolLpHolder {
  pool_id: string;
  user_id: string;
  amount: number;
  lp_token_address: string;
  blockchain_tx_hash: string;
  blockchain_status: string;
  blockchain_block_number: number;
  blockchain_explorer_url: string;
}

export type Patron = {
  id: string;
  created_at?: string;
  user_id: string;
  pool_id: string;
  amount: number;
  verified: boolean;
};
