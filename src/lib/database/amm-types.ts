// Database type definitions for AMM tables

export interface AmmPair {
  id: string;
  pair_address: string;
  token0_address: string;
  token1_address: string;
  factory_address: string;
  created_at_block: number;
  created_at_timestamp: Date;
  total_supply: string;
  reserve0: string;
  reserve1: string;
  last_sync_block?: number;
  last_sync_timestamp?: Date;
  created_at: Date;
  updated_at?: Date;
}

export interface AmmTransaction {
  id: string;
  transaction_hash: string;
  block_number: number;
  timestamp: Date;
  pair_address: string;
  event_type: "mint" | "burn" | "swap";
  user_address: string;
  amount0: string;
  amount1: string;
  amount0_out?: string;
  amount1_out?: string;
  liquidity_amount?: string;
  log_index: number;
  raw_event_data: any;
  created_at: Date;
}

export interface AmmPairSnapshot {
  id: string;
  pair_address: string;
  snapshot_timestamp: Date;
  tvl_usd?: number;
  price_token0?: number;
  price_token1?: number;
  volume_24h?: number;
  fees_24h?: number;
  apr?: number;
  reserve0: string;
  reserve1: string;
  total_supply: string;
  created_at: Date;
}

// Note: Using existing blockchain_events table for AMM event tracking

// Helper types for event processing
export interface EventProcessingResult {
  event: string;
  status: "success" | "error" | "skipped" | "removed";
  action?: string;
  error?: string;
  [key: string]: any;
}

export interface ProcessWebhookEventsResult {
  processed: number;
  skipped: number;
  total: number;
  results: EventProcessingResult[];
  message?: string;
  error?: string;
  status?: number;
}
