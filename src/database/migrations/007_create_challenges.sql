-- ==================================================
-- MIGRATION: 007_create_challenges
-- Description: Create challenges and participants tables
-- ==================================================

-- Main challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Creator
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Challenge info
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Challenge type and target
    challenge_type VARCHAR(50) NOT NULL, -- 'hours', 'sessions', 'streak', 'certifications'
    target_value DECIMAL(10,2) NOT NULL,

    -- Status: pending, active, completed, cancelled
    status VARCHAR(20) DEFAULT 'pending',

    -- Period
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,

    -- Winner (set when challenge ends)
    winner_id UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_challenge_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    CONSTRAINT check_challenge_type CHECK (challenge_type IN ('hours', 'sessions', 'streak', 'certifications')),
    CONSTRAINT check_dates CHECK (end_date > start_date),
    CONSTRAINT check_target CHECK (target_value > 0)
);

-- Challenge participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Invitation status: pending, accepted, rejected
    invitation_status VARCHAR(20) DEFAULT 'pending',

    -- Progress tracking
    current_value DECIMAL(10,2) DEFAULT 0,

    -- Position in ranking (calculated)
    position INT,

    -- Timestamps
    joined_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_participant UNIQUE (challenge_id, user_id),
    CONSTRAINT check_invitation_status CHECK (invitation_status IN ('pending', 'accepted', 'rejected'))
);

-- Indexes for challenges
CREATE INDEX idx_challenges_creator ON challenges(creator_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);

-- Indexes for participants
CREATE INDEX idx_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_participants_status ON challenge_participants(invitation_status);

-- Triggers
CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_participants_updated_at
    BEFORE UPDATE ON challenge_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set joined_at when participant accepts
CREATE OR REPLACE FUNCTION set_participant_joined_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invitation_status = 'accepted' AND OLD.invitation_status != 'accepted' THEN
        NEW.joined_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_participant_joined_at_trigger
    BEFORE UPDATE ON challenge_participants
    FOR EACH ROW
    EXECUTE FUNCTION set_participant_joined_at();
