import { User } from "./supabase";

export interface Benefit {
  id: string;
  description: string;
  tier_id: string;
}

export interface Tier {
  id: string;
  name: string;
  price: string;
  description: string;
  image_url?: string;
  commitments?: any[];
  is_variable_price?: boolean;
  min_price?: string;
  max_price?: string;
  max_supply?: number;
  reward_items?: RewardItem[];
  pool_id: string;
  benefits?: Benefit[];
  patron_count?: number;
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  metadata?: any;
}

export interface Pool {
  id: string;
  created_at?: string;
  name: string;
  title: string;
  description: string;
  image_url?: string;
  target_amount: number;
  cap_amount: number;
  end_date: string;
  currency: string;
  creator_id: string;
  creator?: User;
  status: string;
  location?: string;
  social_links?: Record<string, string>;
  tiers?: (Tier & {})[];
  raised_amount?: number;
  contract_address?: string;
}
