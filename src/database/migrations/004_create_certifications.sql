-- ==================================================
-- MIGRATION: 004_create_certifications
-- Description: Create certifications table
-- ==================================================

CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Certification data
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(255),
    category VARCHAR(100),
    description TEXT,

    -- Score/Result
    score DECIMAL(8,2),
    max_score DECIMAL(8,2),
    passed BOOLEAN DEFAULT true,

    -- Dates
    obtained_at DATE NOT NULL,
    expires_at DATE,

    -- Additional info
    credential_id VARCHAR(255),
    credential_url TEXT,

    -- Tags
    tags TEXT[],

    -- Control
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_score CHECK (score >= 0),
    CONSTRAINT check_max_score CHECK (max_score > 0),
    CONSTRAINT check_score_range CHECK (score <= max_score OR score IS NULL OR max_score IS NULL)
);

-- Indexes
CREATE INDEX idx_certifications_user_id ON certifications(user_id);
CREATE INDEX idx_certifications_name ON certifications(name);
CREATE INDEX idx_certifications_category ON certifications(category);
CREATE INDEX idx_certifications_obtained_at ON certifications(obtained_at DESC);
CREATE INDEX idx_certifications_tags ON certifications USING GIN(tags);

-- Trigger to update updated_at
CREATE TRIGGER update_certifications_updated_at
    BEFORE UPDATE ON certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
