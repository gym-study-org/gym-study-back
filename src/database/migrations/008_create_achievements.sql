-- Migration: Create achievements tables
-- Description: Tables for gamification system with achievements, badges, and trophies

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: achievements (available achievements)
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
    icon VARCHAR(50) NOT NULL,
    requirement_value INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_achievements (unlocked achievements per user)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_tier ON achievements(tier);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);

-- Add total_points column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'total_points'
    ) THEN
        ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add sessions_count column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'sessions_count'
    ) THEN
        ALTER TABLE users ADD COLUMN sessions_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add completed_goals_count column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'completed_goals_count'
    ) THEN
        ALTER TABLE users ADD COLUMN completed_goals_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add friends_count column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'friends_count'
    ) THEN
        ALTER TABLE users ADD COLUMN friends_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add certifications_count column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'certifications_count'
    ) THEN
        ALTER TABLE users ADD COLUMN certifications_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Trigger to update sessions_count when a study session is created
CREATE OR REPLACE FUNCTION update_sessions_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET sessions_count = sessions_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET sessions_count = GREATEST(0, sessions_count - 1) WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sessions_count ON study_sessions;
CREATE TRIGGER trigger_update_sessions_count
AFTER INSERT OR DELETE ON study_sessions
FOR EACH ROW EXECUTE FUNCTION update_sessions_count();

-- Trigger to update certifications_count
CREATE OR REPLACE FUNCTION update_certifications_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET certifications_count = certifications_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET certifications_count = GREATEST(0, certifications_count - 1) WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_certifications_count ON certifications;
CREATE TRIGGER trigger_update_certifications_count
AFTER INSERT OR DELETE ON certifications
FOR EACH ROW EXECUTE FUNCTION update_certifications_count();

-- Trigger to update friends_count when friendship is accepted
CREATE OR REPLACE FUNCTION update_friends_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        UPDATE users SET friends_count = friends_count + 1 WHERE id = NEW.requester_id;
        UPDATE users SET friends_count = friends_count + 1 WHERE id = NEW.addressee_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
        UPDATE users SET friends_count = GREATEST(0, friends_count - 1) WHERE id = OLD.requester_id;
        UPDATE users SET friends_count = GREATEST(0, friends_count - 1) WHERE id = OLD.addressee_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_friends_count ON friendships;
CREATE TRIGGER trigger_update_friends_count
AFTER UPDATE OR DELETE ON friendships
FOR EACH ROW EXECUTE FUNCTION update_friends_count();

-- Trigger to update completed_goals_count
CREATE OR REPLACE FUNCTION update_completed_goals_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE users SET completed_goals_count = completed_goals_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status != 'completed' AND OLD.status = 'completed' THEN
        UPDATE users SET completed_goals_count = GREATEST(0, completed_goals_count - 1) WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_completed_goals_count ON goals;
CREATE TRIGGER trigger_update_completed_goals_count
AFTER UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION update_completed_goals_count();

-- Update existing counts for current users
UPDATE users u SET
    sessions_count = COALESCE((SELECT COUNT(*) FROM study_sessions WHERE user_id = u.id), 0),
    certifications_count = COALESCE((SELECT COUNT(*) FROM certifications WHERE user_id = u.id), 0),
    friends_count = COALESCE((
        SELECT COUNT(*) FROM friendships
        WHERE (requester_id = u.id OR addressee_id = u.id) AND status = 'accepted'
    ), 0),
    completed_goals_count = COALESCE((
        SELECT COUNT(*) FROM goals WHERE user_id = u.id AND status = 'completed'
    ), 0);
