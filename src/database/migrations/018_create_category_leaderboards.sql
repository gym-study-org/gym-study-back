-- Migration 018: Category Leaderboards
-- Stores daily snapshots for historical tracking

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_type VARCHAR(30) NOT NULL
    CHECK (leaderboard_type IN ('global', 'weekly', 'monthly', 'skill')),
  scope VARCHAR(50) NOT NULL DEFAULT 'all',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(12, 2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  previous_position INTEGER,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_snapshots_type_date ON leaderboard_snapshots(leaderboard_type, snapshot_date);
CREATE INDEX idx_leaderboard_snapshots_user ON leaderboard_snapshots(user_id, leaderboard_type);
CREATE UNIQUE INDEX idx_leaderboard_snapshots_unique ON leaderboard_snapshots(leaderboard_type, scope, user_id, snapshot_date);
