-- Add cap_amount column to pools table
ALTER TABLE public.pools
ADD COLUMN IF NOT EXISTS cap_amount NUMERIC;

-- Create reward_items table
CREATE TABLE IF NOT EXISTS public.reward_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'NFT', 'MERCH', 'TICKET'
    metadata JSONB, -- For storing NFT metadata, ticket details, etc.
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true
);

-- Create tiers table
CREATE TABLE IF NOT EXISTS public.tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    max_supply INTEGER, -- NULL means unlimited
    current_supply INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Create tier_reward_items junction table
CREATE TABLE IF NOT EXISTS public.tier_reward_items (
    tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
    reward_item_id UUID NOT NULL REFERENCES reward_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (tier_id, reward_item_id)
);

-- Create patron_tiers table to track which tier a patron committed to
ALTER TABLE public.patrons
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES tiers(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reward_items_creator_id ON reward_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_tiers_pool_id ON tiers(pool_id);
CREATE INDEX IF NOT EXISTS idx_patrons_tier_id ON patrons(tier_id);

-- Add RLS policies
ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_reward_items ENABLE ROW LEVEL SECURITY;

-- Reward items policies
CREATE POLICY "Anyone can view reward items"
    ON reward_items FOR SELECT
    USING (true);

CREATE POLICY "Users can create reward items"
    ON reward_items FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their reward items"
    ON reward_items FOR UPDATE
    USING (auth.uid() = creator_id);

-- Tiers policies
CREATE POLICY "Anyone can view tiers"
    ON tiers FOR SELECT
    USING (true);

CREATE POLICY "Pool creators can create tiers"
    ON tiers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM pools
            WHERE pools.id = tiers.pool_id
            AND pools.creator_id = auth.uid()
        )
    );

CREATE POLICY "Pool creators can update tiers"
    ON tiers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM pools
            WHERE pools.id = tiers.pool_id
            AND pools.creator_id = auth.uid()
        )
    );

-- Tier reward items policies
CREATE POLICY "Anyone can view tier reward items"
    ON tier_reward_items FOR SELECT
    USING (true);

CREATE POLICY "Pool creators can manage tier reward items"
    ON tier_reward_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tiers
            JOIN pools ON pools.id = tiers.pool_id
            WHERE tiers.id = tier_reward_items.tier_id
            AND pools.creator_id = auth.uid()
        )
    ); 