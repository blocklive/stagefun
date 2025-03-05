import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("Initializing Supabase client with URL:", supabaseUrl);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For backwards compatibility
export async function getAuthenticatedSupabaseClient() {
  return supabase;
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

export type Pool = {
  id: string;
  created_at?: string;
  name: string;
  status: string;
  description: string;
  funding_stage: string;
  ends_at: string;
  target_amount: number;
  raised_amount: number;
  currency: string;
  token_amount: number;
  token_symbol: string;
  location?: string;
  venue?: string;
  image_url?: string;
  creator_id: string;
  creator_name?: string;
  min_commitment?: number;
  ticker?: string;
  // Blockchain fields
  blockchain_tx_hash?: string;
  blockchain_block_number?: number;
  blockchain_status?: string;
  blockchain_network?: string;
  blockchain_explorer_url?: string;
  contract_address?: string; // Address of the deployed StageDotFunLiquidity token
};

export type Patron = {
  id: string;
  created_at?: string;
  user_id: string;
  pool_id: string;
  amount: number;
  verified: boolean;
};
