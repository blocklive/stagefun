-- Update pools table to match new contract structure
ALTER TABLE pools
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS total_deposits NUMERIC(78, 0) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_accumulated NUMERIC(78, 0) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lp_holder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pool_status TEXT DEFAULT 'INACTIVE',
ADD COLUMN IF NOT EXISTS milestones JSONB[];

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pools_name ON pools (name);
CREATE INDEX IF NOT EXISTS idx_pools_status ON pools (pool_status);

-- Add table for LP token holders
CREATE TABLE IF NOT EXISTS pool_lp_holders (
    pool_id TEXT REFERENCES pools(id),
    user_id UUID REFERENCES auth.users(id),
    amount NUMERIC(78, 0) DEFAULT 0,
    PRIMARY KEY (pool_id, user_id)
);

-- Add table for pool milestones
CREATE TABLE IF NOT EXISTS pool_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id TEXT REFERENCES pools(id),
    description TEXT,
    amount NUMERIC(78, 0),
    unlock_time TIMESTAMP WITH TIME ZONE,
    approved BOOLEAN DEFAULT false,
    released BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE pool_lp_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_milestones ENABLE ROW LEVEL SECURITY;

-- LP holders policies
CREATE POLICY "Users can view their own LP holdings"
    ON pool_lp_holders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Pool creators can view all LP holdings"
    ON pool_lp_holders FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM pools
        WHERE pools.id = pool_lp_holders.pool_id
        AND pools.creator_id = auth.uid()
    ));

-- Milestone policies
CREATE POLICY "Anyone can view milestones"
    ON pool_milestones FOR SELECT
    USING (true);

CREATE POLICY "Only pool creators can manage milestones"
    ON pool_milestones FOR ALL
    USING (EXISTS (
        SELECT 1 FROM pools
        WHERE pools.id = pool_milestones.pool_id
        AND pools.creator_id = auth.uid()
    )); 