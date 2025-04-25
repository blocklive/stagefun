-- Create a table to track blockchain event processing job runs
CREATE TABLE IF NOT EXISTS blockchain_pool_sync_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  job_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',  -- 'running', 'completed', 'failed'
  events_found INTEGER NOT NULL DEFAULT 0,
  events_processed INTEGER NOT NULL DEFAULT 0,
  events_skipped INTEGER NOT NULL DEFAULT 0,
  events_failed INTEGER NOT NULL DEFAULT 0,
  blocks_processed INTEGER,
  start_block INTEGER,
  end_block INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  source TEXT,
  metadata JSONB
);

-- Create indexes
CREATE INDEX idx_blockchain_pool_sync_runs_job_name ON blockchain_pool_sync_runs(job_name);
CREATE INDEX idx_blockchain_pool_sync_runs_created_at ON blockchain_pool_sync_runs(created_at);
CREATE INDEX idx_blockchain_pool_sync_runs_status ON blockchain_pool_sync_runs(status);

-- Add RLS policies
ALTER TABLE blockchain_pool_sync_runs ENABLE ROW LEVEL SECURITY;

-- Only allow reading blockchain_pool_sync_runs data
CREATE POLICY "Anyone can view blockchain pool sync runs" 
  ON blockchain_pool_sync_runs FOR SELECT 
  USING (true);

-- Only service roles can create, update, or delete blockchain_pool_sync_runs
CREATE POLICY "Only service roles can insert blockchain pool sync runs"
  ON blockchain_pool_sync_runs FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role' OR auth.jwt()->>'role' = 'supabase_admin');

CREATE POLICY "Only service roles can update blockchain pool sync runs"
  ON blockchain_pool_sync_runs FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role' OR auth.jwt()->>'role' = 'supabase_admin');

CREATE POLICY "Only service roles can delete blockchain pool sync runs"
  ON blockchain_pool_sync_runs FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role' OR auth.jwt()->>'role' = 'supabase_admin'); 