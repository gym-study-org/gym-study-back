-- League System: 10 tiers with weekly XP competition
-- Inspired by Duolingo leagues: groups of 30, top promote, bottom demote

-- League tiers definition
CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier INT UNIQUE NOT NULL, -- 1=Bronze, 10=Diamante
    name VARCHAR(50) NOT NULL,
    name_pt VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL, -- hex color
    promotion_slots INT NOT NULL DEFAULT 7,
    demotion_slots INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- League memberships: which group a user is in for a given week
CREATE TABLE IF NOT EXISTS league_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    season_week VARCHAR(10) NOT NULL, -- e.g. '2026-W06'
    group_number INT NOT NULL DEFAULT 1, -- group within the league (max 30 per group)
    weekly_xp INT NOT NULL DEFAULT 0,
    position INT,
    promoted BOOLEAN DEFAULT false,
    demoted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, season_week)
);

-- League history: past season results
CREATE TABLE IF NOT EXISTS league_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    season_week VARCHAR(10) NOT NULL,
    final_position INT NOT NULL,
    final_xp INT NOT NULL DEFAULT 0,
    promoted BOOLEAN DEFAULT false,
    demoted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, season_week)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_league_memberships_user ON league_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_league_memberships_week ON league_memberships(season_week);
CREATE INDEX IF NOT EXISTS idx_league_memberships_league_week ON league_memberships(league_id, season_week, group_number);
CREATE INDEX IF NOT EXISTS idx_league_memberships_xp ON league_memberships(weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_league_history_user ON league_history(user_id);
CREATE INDEX IF NOT EXISTS idx_league_history_week ON league_history(season_week);

-- Add league column to users for quick access
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_league_tier INT DEFAULT 1;

-- Seed the 10 league tiers
INSERT INTO leagues (tier, name, name_pt, icon, color, promotion_slots, demotion_slots) VALUES
(1,  'Bronze',    'Bronze',    'shield',    '#CD7F32', 7, 0),
(2,  'Silver',    'Prata',     'shield',    '#C0C0C0', 7, 5),
(3,  'Gold',      'Ouro',      'shield',    '#FFD700', 7, 5),
(4,  'Sapphire',  'Safira',    'gem',       '#0F52BA', 7, 5),
(5,  'Ruby',      'Rubi',      'gem',       '#E0115F', 7, 5),
(6,  'Emerald',   'Esmeralda', 'gem',       '#50C878', 7, 5),
(7,  'Amethyst',  'Ametista',  'gem',       '#9966CC', 7, 5),
(8,  'Pearl',     'Pérola',    'crown',     '#F0EAD6', 7, 5),
(9,  'Obsidian',  'Obsidiana', 'crown',     '#3D3D3D', 7, 5),
(10, 'Diamond',   'Diamante',  'crown',     '#B9F2FF', 0, 5)
ON CONFLICT (tier) DO NOTHING;
