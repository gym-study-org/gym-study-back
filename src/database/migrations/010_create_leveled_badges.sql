-- Migration: 010_create_leveled_badges.sql
-- Description: Create Duolingo-style leveled badges system
-- Date: 2026-01-30

-- =============================================================
-- Table: badge_definitions
-- Stores the master badge definitions with level configurations
-- =============================================================
CREATE TABLE IF NOT EXISTS badge_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    stat_key VARCHAR(50) NOT NULL,
    max_level INTEGER NOT NULL DEFAULT 10,
    levels JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- levels JSONB structure example:
-- [
--   { "level": 1, "requirement": 1, "points": 10, "name": "Primeiro Passo", "tier": "bronze" },
--   { "level": 2, "requirement": 10, "points": 25, "name": "Dedicado", "tier": "bronze" },
--   ...
-- ]

-- =============================================================
-- Table: user_badges
-- Tracks user's progress on each badge
-- =============================================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL DEFAULT 0,
    current_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    first_unlocked_at TIMESTAMP WITH TIME ZONE,
    last_level_up_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- =============================================================
-- Table: user_badge_history
-- Audit trail of level-ups for animations/notifications
-- =============================================================
CREATE TABLE IF NOT EXISTS user_badge_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
    from_level INTEGER NOT NULL,
    to_level INTEGER NOT NULL,
    points_earned INTEGER NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- Indexes for performance
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_badge_definitions_category ON badge_definitions(category);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_code ON badge_definitions(code);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_current_level ON user_badges(current_level);
CREATE INDEX IF NOT EXISTS idx_user_badge_history_user_id ON user_badge_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_history_triggered_at ON user_badge_history(triggered_at);

-- =============================================================
-- Triggers for updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION update_badge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_badge_definitions_timestamp ON badge_definitions;
CREATE TRIGGER trigger_update_badge_definitions_timestamp
BEFORE UPDATE ON badge_definitions
FOR EACH ROW EXECUTE FUNCTION update_badge_timestamp();

DROP TRIGGER IF EXISTS trigger_update_user_badges_timestamp ON user_badges;
CREATE TRIGGER trigger_update_user_badges_timestamp
BEFORE UPDATE ON user_badges
FOR EACH ROW EXECUTE FUNCTION update_badge_timestamp();
