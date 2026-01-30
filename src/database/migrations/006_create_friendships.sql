-- ==================================================
-- MIGRATION: 006_create_friendships
-- Description: Create friendships table for social features
-- ==================================================

CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Users involved
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status: pending, accepted, rejected, blocked
    status VARCHAR(20) DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,

    -- Constraints
    CONSTRAINT check_different_users CHECK (requester_id != addressee_id),
    CONSTRAINT check_status CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- Indexes
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Trigger to update updated_at
CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set accepted_at when status changes to accepted
CREATE OR REPLACE FUNCTION set_friendship_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        NEW.accepted_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_friendship_accepted_at_trigger
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION set_friendship_accepted_at();
