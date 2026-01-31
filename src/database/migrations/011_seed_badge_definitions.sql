-- Migration: 011_seed_badge_definitions.sql
-- Description: Seed badge definitions with Duolingo-style leveled progression
-- Date: 2026-01-30

-- =============================================================
-- Badge: Estudante (Study Hours) - 10 levels
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('estudante', 'Estudante', 'Acumule horas de estudo para subir de nivel e se tornar um mestre!', 'study_hours', 'GraduationCap', 'total_study_hours', 10,
'[
  {"level": 1, "requirement": 1, "points": 10, "name": "Primeiro Passo", "tier": "bronze"},
  {"level": 2, "requirement": 10, "points": 25, "name": "Dedicado", "tier": "bronze"},
  {"level": 3, "requirement": 50, "points": 50, "name": "Estudioso", "tier": "silver"},
  {"level": 4, "requirement": 100, "points": 100, "name": "Maratonista", "tier": "silver"},
  {"level": 5, "requirement": 250, "points": 200, "name": "Especialista", "tier": "gold"},
  {"level": 6, "requirement": 500, "points": 400, "name": "Mestre", "tier": "gold"},
  {"level": 7, "requirement": 1000, "points": 750, "name": "Lenda", "tier": "platinum"},
  {"level": 8, "requirement": 1500, "points": 1000, "name": "Elite", "tier": "platinum"},
  {"level": 9, "requirement": 2000, "points": 1250, "name": "Supremo", "tier": "diamond"},
  {"level": 10, "requirement": 2500, "points": 1500, "name": "Imortal", "tier": "diamond"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();

-- =============================================================
-- Badge: Sequencia (Streak) - 10 levels
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('sequencia', 'Sequencia', 'Mantenha dias consecutivos de estudo e alimente sua chama!', 'streak', 'Flame', 'longest_streak', 10,
'[
  {"level": 1, "requirement": 3, "points": 15, "name": "Primeira Chama", "tier": "bronze"},
  {"level": 2, "requirement": 7, "points": 30, "name": "Consistente", "tier": "bronze"},
  {"level": 3, "requirement": 14, "points": 60, "name": "Incansavel", "tier": "silver"},
  {"level": 4, "requirement": 30, "points": 120, "name": "Imparavel", "tier": "silver"},
  {"level": 5, "requirement": 60, "points": 250, "name": "Dedicacao Total", "tier": "gold"},
  {"level": 6, "requirement": 100, "points": 500, "name": "Centenario", "tier": "platinum"},
  {"level": 7, "requirement": 150, "points": 750, "name": "Lenda", "tier": "platinum"},
  {"level": 8, "requirement": 200, "points": 1000, "name": "Inquebravel", "tier": "diamond"},
  {"level": 9, "requirement": 300, "points": 1500, "name": "Tita", "tier": "diamond"},
  {"level": 10, "requirement": 365, "points": 2000, "name": "Inabalavel", "tier": "diamond"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();

-- =============================================================
-- Badge: Socializador (Social) - 8 levels
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('socializador', 'Socializador', 'Construa sua rede de amigos e estude junto com eles!', 'social', 'Users', 'friends_count', 8,
'[
  {"level": 1, "requirement": 1, "points": 10, "name": "Primeiro Amigo", "tier": "bronze"},
  {"level": 2, "requirement": 5, "points": 25, "name": "Sociavel", "tier": "bronze"},
  {"level": 3, "requirement": 10, "points": 50, "name": "Popular", "tier": "silver"},
  {"level": 4, "requirement": 25, "points": 150, "name": "Influencer", "tier": "gold"},
  {"level": 5, "requirement": 50, "points": 300, "name": "Celebridade", "tier": "platinum"},
  {"level": 6, "requirement": 75, "points": 450, "name": "Icone", "tier": "platinum"},
  {"level": 7, "requirement": 100, "points": 600, "name": "Lider", "tier": "diamond"},
  {"level": 8, "requirement": 150, "points": 800, "name": "Lenda Social", "tier": "diamond"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();

-- =============================================================
-- Badge: Certificado (Certifications) - 8 levels
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('certificado', 'Certificado', 'Obtenha certificacoes e prove seu conhecimento ao mundo!', 'certifications', 'Award', 'certifications_count', 8,
'[
  {"level": 1, "requirement": 1, "points": 50, "name": "Primeira Conquista", "tier": "bronze"},
  {"level": 2, "requirement": 3, "points": 100, "name": "Colecionador", "tier": "silver"},
  {"level": 3, "requirement": 5, "points": 200, "name": "Expert", "tier": "gold"},
  {"level": 4, "requirement": 10, "points": 400, "name": "Autoridade", "tier": "platinum"},
  {"level": 5, "requirement": 15, "points": 600, "name": "Mestre", "tier": "platinum"},
  {"level": 6, "requirement": 20, "points": 800, "name": "Grandmaster", "tier": "diamond"},
  {"level": 7, "requirement": 30, "points": 1000, "name": "Virtuoso", "tier": "diamond"},
  {"level": 8, "requirement": 50, "points": 1500, "name": "Lenda", "tier": "diamond"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();

-- =============================================================
-- Badge: Focado (Goals) - 8 levels
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('focado', 'Focado', 'Complete metas e demonstre sua determinacao!', 'goals', 'Target', 'completed_goals_count', 8,
'[
  {"level": 1, "requirement": 1, "points": 20, "name": "Objetivo Cumprido", "tier": "bronze"},
  {"level": 2, "requirement": 5, "points": 75, "name": "Focado", "tier": "silver"},
  {"level": 3, "requirement": 10, "points": 150, "name": "Determinado", "tier": "gold"},
  {"level": 4, "requirement": 25, "points": 400, "name": "Conquistador", "tier": "platinum"},
  {"level": 5, "requirement": 50, "points": 600, "name": "Imbativel", "tier": "platinum"},
  {"level": 6, "requirement": 75, "points": 800, "name": "Mestre", "tier": "diamond"},
  {"level": 7, "requirement": 100, "points": 1000, "name": "Perfeccionista", "tier": "diamond"},
  {"level": 8, "requirement": 150, "points": 1500, "name": "Lenda", "tier": "diamond"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();

-- =============================================================
-- Badge: Guerreiro (Sessions) - 10 levels
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('guerreiro', 'Guerreiro', 'Complete sessoes de estudo e se torne um guerreiro do conhecimento!', 'sessions', 'Swords', 'sessions_count', 10,
'[
  {"level": 1, "requirement": 1, "points": 5, "name": "Primeira Sessao", "tier": "bronze"},
  {"level": 2, "requirement": 10, "points": 20, "name": "Ativo", "tier": "bronze"},
  {"level": 3, "requirement": 50, "points": 60, "name": "Veterano", "tier": "silver"},
  {"level": 4, "requirement": 100, "points": 150, "name": "Guerreiro", "tier": "gold"},
  {"level": 5, "requirement": 250, "points": 300, "name": "Campeao", "tier": "gold"},
  {"level": 6, "requirement": 500, "points": 500, "name": "Elite", "tier": "platinum"},
  {"level": 7, "requirement": 750, "points": 750, "name": "Lenda", "tier": "platinum"},
  {"level": 8, "requirement": 1000, "points": 1000, "name": "Mito", "tier": "diamond"},
  {"level": 9, "requirement": 1500, "points": 1250, "name": "Tita", "tier": "diamond"},
  {"level": 10, "requirement": 2000, "points": 1500, "name": "Imortal", "tier": "diamond"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();

-- =============================================================
-- Badge: Madrugador (Special) - 1 level
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('madrugador', 'Madrugador', 'Estude antes das 6h da manha e comece o dia com tudo!', 'special', 'Sunrise', 'special_early_bird', 1,
'[
  {"level": 1, "requirement": 1, "points": 50, "name": "Madrugador", "tier": "silver"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();

-- =============================================================
-- Badge: Coruja Noturna (Special) - 1 level
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('coruja', 'Coruja Noturna', 'Estude apos a meia-noite quando todos dormem!', 'special', 'Moon', 'special_night_owl', 1,
'[
  {"level": 1, "requirement": 1, "points": 50, "name": "Coruja Noturna", "tier": "silver"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();

-- =============================================================
-- Badge: Guerreiro de Fim de Semana (Special) - 5 levels
-- =============================================================
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels) VALUES
('guerreiro_fds', 'Guerreiro de FDS', 'Estude nos fins de semana e nao perca o ritmo!', 'special', 'Calendar', 'special_weekend_warrior', 5,
'[
  {"level": 1, "requirement": 4, "points": 100, "name": "Iniciante", "tier": "gold"},
  {"level": 2, "requirement": 8, "points": 200, "name": "Dedicado", "tier": "gold"},
  {"level": 3, "requirement": 12, "points": 300, "name": "Veterano", "tier": "platinum"},
  {"level": 4, "requirement": 24, "points": 500, "name": "Mestre", "tier": "platinum"},
  {"level": 5, "requirement": 52, "points": 1000, "name": "Lenda", "tier": "diamond"}
]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  levels = EXCLUDED.levels,
  max_level = EXCLUDED.max_level,
  updated_at = NOW();
