-- XP System: transactions log, rules table, user XP columns
-- Tracks all XP earned across activities for gamification

-- XP transactions log (immutable)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id UUID,
    multiplier DECIMAL(3,2) DEFAULT 1.00,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- XP rules (configurable XP values per activity)
CREATE TABLE IF NOT EXISTS xp_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) UNIQUE NOT NULL,
    base_amount INT NOT NULL,
    description_pt VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Add XP columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_xp INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON xp_transactions(source);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_date ON xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_weekly_xp ON users(weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_total_xp ON users(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);

-- Trigger: auto-update user XP totals on new transaction
CREATE OR REPLACE FUNCTION update_user_xp()
RETURNS TRIGGER AS $$
DECLARE
    new_total INT;
    new_level INT;
BEGIN
    UPDATE users SET
        total_xp = total_xp + NEW.amount,
        weekly_xp = weekly_xp + NEW.amount
    WHERE id = NEW.user_id
    RETURNING total_xp INTO new_total;

    -- Calculate level: level = floor(sqrt(total_xp / 100)) + 1
    new_level := GREATEST(1, FLOOR(SQRT(new_total::DECIMAL / 100)) + 1);

    UPDATE users SET level = new_level WHERE id = NEW.user_id AND level != new_level;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_xp ON xp_transactions;
CREATE TRIGGER trigger_update_user_xp
AFTER INSERT ON xp_transactions
FOR EACH ROW EXECUTE FUNCTION update_user_xp();

-- Seed XP rules
INSERT INTO xp_rules (source, base_amount, description_pt) VALUES
('study_session', 10, 'XP por cada 30 minutos de estudo'),
('first_session_of_day', 15, 'Bônus pela primeira sessão do dia'),
('streak_bonus_7', 50, 'Bônus por ofensiva de 7 dias'),
('streak_bonus_30', 200, 'Bônus por ofensiva de 30 dias'),
('streak_bonus_50', 350, 'Bônus por ofensiva de 50 dias'),
('streak_bonus_100', 500, 'Bônus por ofensiva de 100 dias'),
('streak_bonus_200', 1000, 'Bônus por ofensiva de 200 dias'),
('streak_bonus_365', 2000, 'Bônus por ofensiva de 365 dias'),
('challenge_complete', 100, 'Completar um desafio'),
('challenge_win', 150, 'Vencer um desafio'),
('badge_earned', 75, 'Ganhar um badge'),
('achievement_unlocked', 50, 'Desbloquear uma conquista'),
('daily_quest_bronze', 20, 'Completar missão diária bronze'),
('daily_quest_silver', 40, 'Completar missão diária prata'),
('daily_quest_gold', 80, 'Completar missão diária ouro'),
('friend_quest_complete', 120, 'Completar missão com amigo'),
('certification_pass', 200, 'Passar em uma certificação'),
('goal_complete', 100, 'Completar uma meta'),
('endorsement_received', 10, 'Receber um endorsement')
ON CONFLICT (source) DO NOTHING;
