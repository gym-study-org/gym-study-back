-- ==================================================
-- MIGRATION: 005_create_goals
-- Description: Create goals table for study targets
-- ==================================================

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Goal data
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- Target
    target_type VARCHAR(50) NOT NULL, -- 'hours', 'sessions', 'certifications', 'custom'
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    completed_at TIMESTAMP,

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,

    -- Tags
    tags TEXT[],

    -- Control
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_target_value CHECK (target_value > 0),
    CONSTRAINT check_current_value CHECK (current_value >= 0),
    CONSTRAINT check_status CHECK (status IN ('active', 'completed', 'abandoned')),
    CONSTRAINT check_target_type CHECK (target_type IN ('hours', 'sessions', 'certifications', 'custom'))
);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_category ON goals(category);
CREATE INDEX idx_goals_start_date ON goals(start_date);
CREATE INDEX idx_goals_end_date ON goals(end_date);
CREATE INDEX idx_goals_tags ON goals USING GIN(tags);

-- Trigger to update updated_at
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_goal_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_goal_completed_at_trigger
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION set_goal_completed_at();
