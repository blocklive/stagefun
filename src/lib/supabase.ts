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
  smart_wallet_address?: string;
  privy_did?: string;
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
  cap_amount?: number; // Optional cap amount for the pool
  raised_amount: number;
  currency: string;
  token_amount: number;
  token_symbol: string;
  location?: string;
  venue?: string;
  image_url?: string | null;
  creator_id: string;
  creator_name?: string;
  creator_avatar_url?: string;
  min_commitment?: number;
  ticker?: string;
  // Blockchain fields
  blockchain_tx_hash?: string;
  blockchain_block_number?: number;
  blockchain_status: number;
  blockchain_network?: string;
  blockchain_explorer_url?: string;
  contract_address?: string; // Address of the deployed pool contract
  lp_token_address?: string;
  // Additional fields
  revenue_accumulated?: number;
  patron_count?: number;
  patrons_number?: number;
  lp_holders?: any[];
  milestones?: any[];
  emergency_mode?: boolean;
  emergency_withdrawal_request_time?: number;
  authorized_withdrawer?: string;
  // Social links
  social_links?: {
    website?: string;
    twitter?: string;
    discord?: string;
    instagram?: string;
    [key: string]: string | undefined;
  } | null;
};

export type Patron = {
  id: string;
  created_at?: string;
  user_id: string;
  pool_id: string;
  amount: number;
  verified: boolean;
};

// Points system types
export type UserPoints = {
  id: string;
  user_id: string;
  total_points: number;
  created_at: string;
  updated_at: string;
};

export type PointTransaction = {
  id: string;
  user_id: string;
  amount: number;
  action_type: string;
  created_at: string;
  metadata?: {
    streak_count?: number;
    reason?: string;
    [key: string]: any;
  };
};

export type DailyCheckin = {
  id: string;
  user_id: string;
  streak_count: number;
  last_checkin_at: string;
  next_available_at: string;
  created_at: string;
};
