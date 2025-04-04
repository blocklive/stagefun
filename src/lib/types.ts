import { User } from "./supabase";

export interface Benefit {
  id: string;
  description: string;
  tier_id: string;
}

export interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  pool_id: string;
  benefits?: Benefit[];
  patron_count?: number;
  commitments?: {
    user_address: string;
    amount: number;
    committed_at: string;
  }[];
}

export interface Pool {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  target_amount: number;
  raised_amount: number;
  start_date?: string;
  end_date?: string;
  status: "OPEN" | "FUNDED" | "EXECUTING" | "FAILED";
  creator_id: string;
  creator?: User;
  contract_address?: string;
  token_address?: string;
  token_symbol?: string;
  token_name?: string;
  token_decimals?: number;
  token_supply?: number;
  token_logo_url?: string;
  location?: string;
  location_details?: string;
  tiers?: Tier[];
}
