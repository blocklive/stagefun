import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  username?: string;
  email?: string;
  twitter_username?: string;
  avatar_url?: string;
  created_at: string;
}

export type Pool = {
  id: string;
  created_at?: string;
  name: string;
  description: string;
  image_url?: string;
  target_amount: number;
  cap_amount: number;
  ends_at: string;
  currency: string;
  creator_id: string;
  creator?: User;
  status: string;
  blockchain_status?: string;
  location?: string;
  social_links?: Record<string, string>;
  raised_amount?: number;
  contract_address?: string;
  lp_token_address?: string;
  funding_stage?: string;
  venue?: string;
  min_commitment?: number;
  ticker?: string;
  blockchain_tx_hash?: string;
  blockchain_block_number?: number;
  blockchain_network?: string;
  blockchain_explorer_url?: string;
  display_public?: boolean;
  featured?: number;
  tiers?: {
    id: string;
    name: string;
    commitments?: {
      user_address: string;
      amount: number;
      committed_at: string;
      user: {
        id: string;
        name: string;
        avatar_url: string;
      };
    }[];
  }[];
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
