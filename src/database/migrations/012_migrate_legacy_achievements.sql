-- Migration: 012_migrate_legacy_achievements.sql
-- Description: Migrate existing user data to the new leveled badges system
-- Date: 2026-01-30

-- =============================================================
-- Create user_badges for all existing users based on their stats
-- =============================================================

-- Function to calculate level from value and levels JSONB
CREATE OR REPLACE FUNCTION calculate_badge_level(
    p_value DECIMAL,
    p_levels JSONB
) RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER := 0;
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_levels)
    LOOP
        IF p_value >= (v_item->>'requirement')::DECIMAL THEN
            v_level := (v_item->>'level')::INTEGER;
        END IF;
    END LOOP;
    RETURN v_level;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total points from levels achieved
CREATE OR REPLACE FUNCTION calculate_badge_points(
    p_level INTEGER,
    p_levels JSONB
) RETURNS INTEGER AS $$
DECLARE
    v_points INTEGER := 0;
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_levels)
    LOOP
        IF (v_item->>'level')::INTEGER <= p_level THEN
            v_points := v_points + (v_item->>'points')::INTEGER;
        END IF;
    END LOOP;
    RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- Migrate Study Hours Badge (estudante)
-- =============================================================
INSERT INTO user_badges (user_id, badge_id, current_level, current_value, total_points_earned, first_unlocked_at, last_level_up_at)
SELECT
    u.id as user_id,
    bd.id as badge_id,
    calculate_badge_level(COALESCE(u.total_study_hours, 0), bd.levels) as current_level,
    COALESCE(u.total_study_hours, 0) as current_value,
    calculate_badge_points(calculate_badge_level(COALESCE(u.total_study_hours, 0), bd.levels), bd.levels) as total_points_earned,
    CASE WHEN calculate_badge_level(COALESCE(u.total_study_hours, 0), bd.levels) > 0 THEN u.created_at ELSE NULL END as first_unlocked_at,
    CASE WHEN calculate_badge_level(COALESCE(u.total_study_hours, 0), bd.levels) > 0 THEN NOW() ELSE NULL END as last_level_up_at
FROM users u
CROSS JOIN badge_definitions bd
WHERE bd.code = 'estudante'
ON CONFLICT (user_id, badge_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    current_value = EXCLUDED.current_value,
    total_points_earned = EXCLUDED.total_points_earned,
    updated_at = NOW();

-- =============================================================
-- Migrate Streak Badge (sequencia)
-- =============================================================
INSERT INTO user_badges (user_id, badge_id, current_level, current_value, total_points_earned, first_unlocked_at, last_level_up_at)
SELECT
    u.id as user_id,
    bd.id as badge_id,
    calculate_badge_level(COALESCE(u.longest_streak, 0), bd.levels) as current_level,
    COALESCE(u.longest_streak, 0) as current_value,
    calculate_badge_points(calculate_badge_level(COALESCE(u.longest_streak, 0), bd.levels), bd.levels) as total_points_earned,
    CASE WHEN calculate_badge_level(COALESCE(u.longest_streak, 0), bd.levels) > 0 THEN u.created_at ELSE NULL END as first_unlocked_at,
    CASE WHEN calculate_badge_level(COALESCE(u.longest_streak, 0), bd.levels) > 0 THEN NOW() ELSE NULL END as last_level_up_at
FROM users u
CROSS JOIN badge_definitions bd
WHERE bd.code = 'sequencia'
ON CONFLICT (user_id, badge_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    current_value = EXCLUDED.current_value,
    total_points_earned = EXCLUDED.total_points_earned,
    updated_at = NOW();

-- =============================================================
-- Migrate Social Badge (socializador)
-- =============================================================
INSERT INTO user_badges (user_id, badge_id, current_level, current_value, total_points_earned, first_unlocked_at, last_level_up_at)
SELECT
    u.id as user_id,
    bd.id as badge_id,
    calculate_badge_level(COALESCE(u.friends_count, 0), bd.levels) as current_level,
    COALESCE(u.friends_count, 0) as current_value,
    calculate_badge_points(calculate_badge_level(COALESCE(u.friends_count, 0), bd.levels), bd.levels) as total_points_earned,
    CASE WHEN calculate_badge_level(COALESCE(u.friends_count, 0), bd.levels) > 0 THEN u.created_at ELSE NULL END as first_unlocked_at,
    CASE WHEN calculate_badge_level(COALESCE(u.friends_count, 0), bd.levels) > 0 THEN NOW() ELSE NULL END as last_level_up_at
FROM users u
CROSS JOIN badge_definitions bd
WHERE bd.code = 'socializador'
ON CONFLICT (user_id, badge_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    current_value = EXCLUDED.current_value,
    total_points_earned = EXCLUDED.total_points_earned,
    updated_at = NOW();

-- =============================================================
-- Migrate Certifications Badge (certificado)
-- =============================================================
INSERT INTO user_badges (user_id, badge_id, current_level, current_value, total_points_earned, first_unlocked_at, last_level_up_at)
SELECT
    u.id as user_id,
    bd.id as badge_id,
    calculate_badge_level(COALESCE(u.certifications_count, 0), bd.levels) as current_level,
    COALESCE(u.certifications_count, 0) as current_value,
    calculate_badge_points(calculate_badge_level(COALESCE(u.certifications_count, 0), bd.levels), bd.levels) as total_points_earned,
    CASE WHEN calculate_badge_level(COALESCE(u.certifications_count, 0), bd.levels) > 0 THEN u.created_at ELSE NULL END as first_unlocked_at,
    CASE WHEN calculate_badge_level(COALESCE(u.certifications_count, 0), bd.levels) > 0 THEN NOW() ELSE NULL END as last_level_up_at
FROM users u
CROSS JOIN badge_definitions bd
WHERE bd.code = 'certificado'
ON CONFLICT (user_id, badge_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    current_value = EXCLUDED.current_value,
    total_points_earned = EXCLUDED.total_points_earned,
    updated_at = NOW();

-- =============================================================
-- Migrate Goals Badge (focado)
-- =============================================================
INSERT INTO user_badges (user_id, badge_id, current_level, current_value, total_points_earned, first_unlocked_at, last_level_up_at)
SELECT
    u.id as user_id,
    bd.id as badge_id,
    calculate_badge_level(COALESCE(u.completed_goals_count, 0), bd.levels) as current_level,
    COALESCE(u.completed_goals_count, 0) as current_value,
    calculate_badge_points(calculate_badge_level(COALESCE(u.completed_goals_count, 0), bd.levels), bd.levels) as total_points_earned,
    CASE WHEN calculate_badge_level(COALESCE(u.completed_goals_count, 0), bd.levels) > 0 THEN u.created_at ELSE NULL END as first_unlocked_at,
    CASE WHEN calculate_badge_level(COALESCE(u.completed_goals_count, 0), bd.levels) > 0 THEN NOW() ELSE NULL END as last_level_up_at
FROM users u
CROSS JOIN badge_definitions bd
WHERE bd.code = 'focado'
ON CONFLICT (user_id, badge_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    current_value = EXCLUDED.current_value,
    total_points_earned = EXCLUDED.total_points_earned,
    updated_at = NOW();

-- =============================================================
-- Migrate Sessions Badge (guerreiro)
-- =============================================================
INSERT INTO user_badges (user_id, badge_id, current_level, current_value, total_points_earned, first_unlocked_at, last_level_up_at)
SELECT
    u.id as user_id,
    bd.id as badge_id,
    calculate_badge_level(COALESCE(u.sessions_count, 0), bd.levels) as current_level,
    COALESCE(u.sessions_count, 0) as current_value,
    calculate_badge_points(calculate_badge_level(COALESCE(u.sessions_count, 0), bd.levels), bd.levels) as total_points_earned,
    CASE WHEN calculate_badge_level(COALESCE(u.sessions_count, 0), bd.levels) > 0 THEN u.created_at ELSE NULL END as first_unlocked_at,
    CASE WHEN calculate_badge_level(COALESCE(u.sessions_count, 0), bd.levels) > 0 THEN NOW() ELSE NULL END as last_level_up_at
FROM users u
CROSS JOIN badge_definitions bd
WHERE bd.code = 'guerreiro'
ON CONFLICT (user_id, badge_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    current_value = EXCLUDED.current_value,
    total_points_earned = EXCLUDED.total_points_earned,
    updated_at = NOW();

-- =============================================================
-- Initialize Special Badges for all users (level 0)
-- =============================================================
INSERT INTO user_badges (user_id, badge_id, current_level, current_value, total_points_earned)
SELECT
    u.id as user_id,
    bd.id as badge_id,
    0 as current_level,
    0 as current_value,
    0 as total_points_earned
FROM users u
CROSS JOIN badge_definitions bd
WHERE bd.code IN ('madrugador', 'coruja', 'guerreiro_fds')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- =============================================================
-- Update users total_points based on new badge points
-- =============================================================
UPDATE users u
SET total_points = COALESCE((
    SELECT SUM(total_points_earned)
    FROM user_badges ub
    WHERE ub.user_id = u.id
), 0);

-- =============================================================
-- Clean up helper functions (optional - keep them for future use)
-- =============================================================
-- DROP FUNCTION IF EXISTS calculate_badge_level(DECIMAL, JSONB);
-- DROP FUNCTION IF EXISTS calculate_badge_points(INTEGER, JSONB);
