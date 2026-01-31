-- Migration: Seed achievements
-- Description: Populate achievements table with 30+ achievements across 6 categories

-- Clear existing achievements (for fresh seed)
TRUNCATE TABLE user_achievements CASCADE;
TRUNCATE TABLE achievements CASCADE;

-- =====================================================
-- Category: study_hours (Horas de Estudo)
-- =====================================================
INSERT INTO achievements (code, name, description, category, tier, icon, requirement_value, points) VALUES
('study_hours_1', 'Primeiro Passo', 'Estude sua primeira hora. Toda jornada começa com um passo!', 'study_hours', 'bronze', 'Clock', 1, 10),
('study_hours_10', 'Estudante Dedicado', 'Acumule 10 horas de estudo. Voce esta no caminho certo!', 'study_hours', 'bronze', 'Clock', 10, 25),
('study_hours_50', 'Estudioso', 'Acumule 50 horas de estudo. Sua dedicacao e admiravel!', 'study_hours', 'silver', 'BookOpen', 50, 50),
('study_hours_100', 'Maratonista', 'Acumule 100 horas de estudo. Voce e imparavel!', 'study_hours', 'silver', 'BookOpen', 100, 100),
('study_hours_250', 'Especialista', 'Acumule 250 horas de estudo. Voce esta se tornando um expert!', 'study_hours', 'gold', 'GraduationCap', 250, 200),
('study_hours_500', 'Mestre', 'Acumule 500 horas de estudo. Poucos chegam tao longe!', 'study_hours', 'gold', 'GraduationCap', 500, 400),
('study_hours_1000', 'Lenda', 'Acumule 1000 horas de estudo. Voce e uma lenda viva!', 'study_hours', 'platinum', 'Crown', 1000, 750),
('study_hours_2500', 'Imortal', 'Acumule 2500 horas de estudo. Sua dedicacao transcende o comum!', 'study_hours', 'diamond', 'Gem', 2500, 1500);

-- =====================================================
-- Category: streak (Dias Consecutivos)
-- =====================================================
INSERT INTO achievements (code, name, description, category, tier, icon, requirement_value, points) VALUES
('streak_3', 'Primeira Chama', 'Mantenha uma sequencia de 3 dias estudando. A chama acendeu!', 'streak', 'bronze', 'Flame', 3, 15),
('streak_7', 'Consistente', 'Mantenha uma sequencia de 7 dias estudando. Uma semana perfeita!', 'streak', 'bronze', 'Flame', 7, 30),
('streak_14', 'Incansavel', 'Mantenha uma sequencia de 14 dias estudando. Duas semanas de foco!', 'streak', 'silver', 'Zap', 14, 60),
('streak_30', 'Imparavel', 'Mantenha uma sequencia de 30 dias estudando. Um mes inteiro!', 'streak', 'silver', 'Zap', 30, 120),
('streak_60', 'Dedicacao Total', 'Mantenha uma sequencia de 60 dias estudando. Dois meses de pura dedicacao!', 'streak', 'gold', 'Target', 60, 250),
('streak_100', 'Lenda da Consistencia', 'Mantenha uma sequencia de 100 dias estudando. Voce e uma lenda!', 'streak', 'platinum', 'Star', 100, 500),
('streak_365', 'Inabalavel', 'Mantenha uma sequencia de 365 dias estudando. Um ano inteiro sem parar!', 'streak', 'diamond', 'Diamond', 365, 2000);

-- =====================================================
-- Category: social (Amizades)
-- =====================================================
INSERT INTO achievements (code, name, description, category, tier, icon, requirement_value, points) VALUES
('social_1', 'Primeiro Amigo', 'Adicione seu primeiro amigo. Juntos somos mais fortes!', 'social', 'bronze', 'UserPlus', 1, 10),
('social_5', 'Sociavel', 'Tenha 5 amigos. Sua rede esta crescendo!', 'social', 'bronze', 'Users', 5, 25),
('social_10', 'Popular', 'Tenha 10 amigos. Voce e bem conhecido na comunidade!', 'social', 'silver', 'Users', 10, 50),
('social_25', 'Influencer', 'Tenha 25 amigos. Sua influencia e notavel!', 'social', 'gold', 'Crown', 25, 150),
('social_50', 'Celebridade', 'Tenha 50 amigos. Voce e uma celebridade do estudo!', 'social', 'platinum', 'Star', 50, 300);

-- =====================================================
-- Category: certifications (Certificacoes)
-- =====================================================
INSERT INTO achievements (code, name, description, category, tier, icon, requirement_value, points) VALUES
('cert_1', 'Primeira Conquista', 'Obtenha sua primeira certificacao. O primeiro de muitos!', 'certifications', 'bronze', 'Award', 1, 50),
('cert_3', 'Colecionador', 'Obtenha 3 certificacoes. Sua colecao esta crescendo!', 'certifications', 'silver', 'Medal', 3, 100),
('cert_5', 'Expert', 'Obtenha 5 certificacoes. Voce e um verdadeiro expert!', 'certifications', 'gold', 'Trophy', 5, 200),
('cert_10', 'Autoridade', 'Obtenha 10 certificacoes. Sua autoridade e inquestionavel!', 'certifications', 'platinum', 'Crown', 10, 400),
('cert_20', 'Mestre das Certificacoes', 'Obtenha 20 certificacoes. Voce domina todas as areas!', 'certifications', 'diamond', 'Gem', 20, 1000);

-- =====================================================
-- Category: goals (Metas)
-- =====================================================
INSERT INTO achievements (code, name, description, category, tier, icon, requirement_value, points) VALUES
('goals_1', 'Objetivo Cumprido', 'Complete sua primeira meta. Objetivos sao feitos para serem alcancados!', 'goals', 'bronze', 'Target', 1, 20),
('goals_5', 'Focado', 'Complete 5 metas. Seu foco e impressionante!', 'goals', 'silver', 'Crosshair', 5, 75),
('goals_10', 'Determinado', 'Complete 10 metas. Determinacao e sua marca registrada!', 'goals', 'gold', 'CheckCircle', 10, 150),
('goals_25', 'Conquistador', 'Complete 25 metas. Voce conquista tudo que almeja!', 'goals', 'platinum', 'Trophy', 25, 400);

-- =====================================================
-- Category: sessions (Sessoes de Estudo)
-- =====================================================
INSERT INTO achievements (code, name, description, category, tier, icon, requirement_value, points) VALUES
('sessions_1', 'Primeira Sessao', 'Complete sua primeira sessao de estudo. Bem-vindo ao GymStudy!', 'sessions', 'bronze', 'Play', 1, 5),
('sessions_10', 'Estudante Ativo', 'Complete 10 sessoes de estudo. Voce esta pegando o ritmo!', 'sessions', 'bronze', 'BookMarked', 10, 20),
('sessions_50', 'Veterano', 'Complete 50 sessoes de estudo. Voce e um veterano!', 'sessions', 'silver', 'BookMarked', 50, 60),
('sessions_100', 'Guerreiro do Conhecimento', 'Complete 100 sessoes de estudo. Um verdadeiro guerreiro!', 'sessions', 'gold', 'Swords', 100, 150),
('sessions_500', 'Lenda do Estudo', 'Complete 500 sessoes de estudo. Sua lenda sera contada!', 'sessions', 'platinum', 'Crown', 500, 500),
('sessions_1000', 'Mito', 'Complete 1000 sessoes de estudo. Voce transcendeu para o status de mito!', 'sessions', 'diamond', 'Sparkles', 1000, 1500);

-- =====================================================
-- Special achievements (bonus)
-- =====================================================
INSERT INTO achievements (code, name, description, category, tier, icon, requirement_value, points) VALUES
('early_bird', 'Madrugador', 'Complete uma sessao de estudo antes das 6h da manha.', 'special', 'silver', 'Sunrise', 1, 50),
('night_owl', 'Coruja Noturna', 'Complete uma sessao de estudo apos a meia-noite.', 'special', 'silver', 'Moon', 1, 50),
('weekend_warrior', 'Guerreiro de Fim de Semana', 'Estude em 4 fins de semana consecutivos.', 'special', 'gold', 'Calendar', 4, 100);
