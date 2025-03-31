-- Create a table to track which missions users have completed
CREATE TABLE IF NOT EXISTS user_completed_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  points_awarded BOOLEAN DEFAULT FALSE,
  
  -- Ensure a user can only complete a mission once
  UNIQUE(user_id, mission_id)
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_completed_missions_user_id ON user_completed_missions(user_id); 