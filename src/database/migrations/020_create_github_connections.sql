-- Migration 020: Create GitHub Connections

CREATE TABLE IF NOT EXISTS github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  github_username VARCHAR(100) NOT NULL,
  github_id VARCHAR(50),
  access_token TEXT NOT NULL,
  -- Cached stats (updated by sync job)
  public_repos INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  commits_30d INTEGER DEFAULT 0,
  contributions_year INTEGER DEFAULT 0,
  primary_languages JSONB DEFAULT '[]',
  profile_url VARCHAR(500),
  avatar_url VARCHAR(500),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_connections_user_id ON github_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_github_connections_github_username ON github_connections(github_username);
