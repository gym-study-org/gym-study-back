-- ==================================================
-- MIGRATION: 003_create_study_sessions
-- Description: Create study_sessions table
-- ==================================================

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session data
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    is_for_certification BOOLEAN DEFAULT false,
    certification_name VARCHAR(255),

    -- Tags/categories
    tags TEXT[],

    -- Control
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_duration CHECK (duration_minutes > 0),
    CONSTRAINT check_times CHECK (finished_at > started_at)
);

-- Indexes
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_subject ON study_sessions(subject);
CREATE INDEX idx_study_sessions_started_at ON study_sessions(started_at DESC);
CREATE INDEX idx_study_sessions_is_for_certification ON study_sessions(is_for_certification);
CREATE INDEX idx_study_sessions_tags ON study_sessions USING GIN(tags);

-- Trigger to update updated_at
CREATE TRIGGER update_study_sessions_updated_at
    BEFORE UPDATE ON study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update user's total_study_hours
CREATE OR REPLACE FUNCTION update_user_study_hours()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET total_study_hours = total_study_hours + (NEW.duration_minutes / 60.0),
        last_study_date = NEW.started_at::date
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_study_hours_trigger
    AFTER INSERT ON study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_study_hours();
