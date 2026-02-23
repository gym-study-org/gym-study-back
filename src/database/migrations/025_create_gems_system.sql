-- Gems System: virtual currency for purchasing items (streak freeze, etc.)

-- Add gems balance to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS gems_balance INT DEFAULT 0;

-- Gem transactions log (immutable)
CREATE TABLE IF NOT EXISTS gem_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL, -- positive = earned, negative = spent
    source VARCHAR(50) NOT NULL,
    source_id UUID,
    description_pt VARCHAR(255),
    balance_after INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop items available for purchase
CREATE TABLE IF NOT EXISTS shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    name_pt VARCHAR(100) NOT NULL,
    description_pt VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL,
    gem_cost INT NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'gift',
    is_active BOOLEAN DEFAULT true,
    max_per_user INT, -- NULL = unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User purchases log
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_item_id UUID NOT NULL REFERENCES shop_items(id),
    gem_cost INT NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gem_transactions_user ON gem_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_created ON gem_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_user_date ON gem_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_users_gems ON users(gems_balance DESC);

-- Trigger: auto-update user gems balance on transaction
CREATE OR REPLACE FUNCTION update_user_gems()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET gems_balance = gems_balance + NEW.amount WHERE id = NEW.user_id;
    -- Store the balance after in the transaction
    UPDATE gem_transactions SET balance_after = (
      SELECT gems_balance FROM users WHERE id = NEW.user_id
    ) WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_gems ON gem_transactions;
CREATE TRIGGER trigger_update_user_gems
AFTER INSERT ON gem_transactions
FOR EACH ROW EXECUTE FUNCTION update_user_gems();

-- Seed shop items
INSERT INTO shop_items (item_code, name_pt, description_pt, category, gem_cost, icon, max_per_user) VALUES
('streak_freeze', 'Freeze de Ofensiva', 'Protege sua ofensiva por 1 dia caso você não estude. Máximo de 2.', 'streak', 200, 'shield', NULL),
('xp_boost_2x', 'Boost de XP 2x', 'Dobra o XP ganho nas próximas 24 horas.', 'boost', 500, 'zap', NULL),
('profile_badge_fire', 'Badge de Fogo', 'Exiba um badge especial de fogo no seu perfil.', 'cosmetic', 300, 'flame', 1),
('profile_badge_star', 'Badge Estrela', 'Exiba um badge especial de estrela no seu perfil.', 'cosmetic', 300, 'star', 1),
('profile_badge_crown', 'Badge Coroa', 'Exiba um badge especial de coroa no seu perfil.', 'cosmetic', 500, 'crown', 1)
ON CONFLICT (item_code) DO NOTHING;
