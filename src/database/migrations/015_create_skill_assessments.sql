-- Migration 015: Skill Assessments System
-- Tables: skill_categories, assessment_questions, assessment_attempts, verified_skills, peer_endorsements

-- Skill Categories (hierarchical)
CREATE TABLE IF NOT EXISTS skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'Code',
  parent_id UUID REFERENCES skill_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_skill_categories_parent ON skill_categories(parent_id);
CREATE INDEX idx_skill_categories_code ON skill_categories(code);

-- Assessment Questions Bank
CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice', 'code_output', 'true_false')),
  difficulty VARCHAR(20) NOT NULL DEFAULT 'intermediate'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  time_limit_seconds INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assessment_questions_category ON assessment_questions(skill_category_id);
CREATE INDEX idx_assessment_questions_difficulty ON assessment_questions(difficulty);

-- Assessment Attempts
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'expired', 'abandoned')),
  total_questions INTEGER NOT NULL DEFAULT 10,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  score DECIMAL(5, 2) DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]',
  question_ids UUID[] NOT NULL DEFAULT '{}',
  current_question_index INTEGER DEFAULT 0,
  time_limit_minutes INTEGER DEFAULT 15,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX idx_assessment_attempts_category ON assessment_attempts(skill_category_id);
CREATE INDEX idx_assessment_attempts_status ON assessment_attempts(status);
CREATE INDEX idx_assessment_attempts_expires ON assessment_attempts(expires_at) WHERE status = 'in_progress';

-- Verified Skills (earned via assessment or endorsement)
CREATE TABLE IF NOT EXISTS verified_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  verification_type VARCHAR(30) NOT NULL DEFAULT 'assessment'
    CHECK (verification_type IN ('assessment', 'peer_endorsement', 'github_validation')),
  assessment_attempt_id UUID REFERENCES assessment_attempts(id) ON DELETE SET NULL,
  score DECIMAL(5, 2),
  level VARCHAR(20) NOT NULL DEFAULT 'intermediate'
    CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  endorsement_count INTEGER DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '12 months'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, skill_category_id, verification_type)
);

CREATE INDEX idx_verified_skills_user ON verified_skills(user_id);
CREATE INDEX idx_verified_skills_category ON verified_skills(skill_category_id);
CREATE INDEX idx_verified_skills_active ON verified_skills(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_verified_skills_expires ON verified_skills(expires_at) WHERE is_active = true;

-- Peer Endorsements
CREATE TABLE IF NOT EXISTS peer_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endorsed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(endorser_id, endorsed_id, skill_category_id)
);

CREATE INDEX idx_peer_endorsements_endorsed ON peer_endorsements(endorsed_id);
CREATE INDEX idx_peer_endorsements_endorser ON peer_endorsements(endorser_id);
CREATE INDEX idx_peer_endorsements_skill ON peer_endorsements(skill_category_id);

-- Trigger to update endorsement_count on verified_skills
CREATE OR REPLACE FUNCTION update_endorsement_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE verified_skills
    SET endorsement_count = endorsement_count + 1, updated_at = NOW()
    WHERE user_id = NEW.endorsed_id
      AND skill_category_id = NEW.skill_category_id
      AND is_active = true;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE verified_skills
    SET endorsement_count = GREATEST(endorsement_count - 1, 0), updated_at = NOW()
    WHERE user_id = OLD.endorsed_id
      AND skill_category_id = OLD.skill_category_id
      AND is_active = true;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_endorsement_count
AFTER INSERT OR DELETE ON peer_endorsements
FOR EACH ROW EXECUTE FUNCTION update_endorsement_count();
