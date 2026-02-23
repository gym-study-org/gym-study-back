-- Enhanced Streaks: freeze protection, milestones tracking, XP integration

-- Add streak freeze columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes_available INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freeze_used_today BOOLEAN DEFAULT false;

-- Streak freeze usage log
CREATE TABLE IF NOT EXISTS streak_freezes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_on DATE NOT NULL,
    was_auto BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, used_on)
);

-- Streak milestones achieved
CREATE TABLE IF NOT EXISTS streak_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_days INT NOT NULL,
    xp_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, milestone_days)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user ON streak_freezes(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_freezes_date ON streak_freezes(used_on);
CREATE INDEX IF NOT EXISTS idx_streak_milestones_user ON streak_milestones(user_id);
