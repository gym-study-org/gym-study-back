-- Daily Quests: 3 missions per day (bronze/silver/gold) with XP rewards

-- Quest templates (reusable definitions)
CREATE TABLE IF NOT EXISTS quest_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quest_type VARCHAR(50) NOT NULL,
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
    title_pt VARCHAR(255) NOT NULL,
    description_pt VARCHAR(500) NOT NULL,
    target_value INT NOT NULL,
    xp_reward INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User daily quests (assigned per day)
CREATE TABLE IF NOT EXISTS user_daily_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_template_id UUID NOT NULL REFERENCES quest_templates(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_progress INT NOT NULL DEFAULT 0,
    target_value INT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    xp_claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, quest_template_id, quest_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quest_templates_tier ON quest_templates(tier);
CREATE INDEX IF NOT EXISTS idx_quest_templates_type ON quest_templates(quest_type);
CREATE INDEX IF NOT EXISTS idx_user_daily_quests_user_date ON user_daily_quests(user_id, quest_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_quests_completed ON user_daily_quests(is_completed);

-- Seed quest templates
INSERT INTO quest_templates (quest_type, tier, title_pt, description_pt, target_value, xp_reward) VALUES
-- Bronze (easier)
('study_minutes', 'bronze', 'Estudante Iniciante', 'Estude por pelo menos 30 minutos hoje', 30, 20),
('study_sessions', 'bronze', 'Primeira Sessão', 'Complete 1 sessão de estudo', 1, 20),
('earn_xp', 'bronze', 'Caçador de XP', 'Ganhe pelo menos 20 XP hoje', 20, 20),
-- Silver (medium)
('study_minutes', 'silver', 'Estudante Dedicado', 'Estude por pelo menos 60 minutos hoje', 60, 40),
('study_sessions', 'silver', 'Maratonista', 'Complete 2 sessões de estudo', 2, 40),
('post_in_feed', 'silver', 'Compartilhador', 'Publique algo no feed', 1, 40),
-- Gold (harder)
('study_minutes', 'gold', 'Mestre do Estudo', 'Estude por pelo menos 120 minutos hoje', 120, 80),
('earn_xp', 'gold', 'Máquina de XP', 'Ganhe pelo menos 100 XP hoje', 100, 80),
('comment_on_post', 'gold', 'Engajador Social', 'Comente em 3 posts no feed', 3, 80)
ON CONFLICT DO NOTHING;
