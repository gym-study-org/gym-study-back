-- Migration 029: Add audience column to posts
-- Differentiates between global feed posts and personal profile posts

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'global'
    CHECK (audience IN ('global', 'personal'));

CREATE INDEX IF NOT EXISTS idx_posts_audience
  ON posts(audience)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN posts.audience IS 'global = appears in /feed for everyone; personal = only visible on the user profile page';
