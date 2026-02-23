-- Migration 017: Enhance Badge Definitions for Authority Badges
-- Adds verification requirements and hireable signal fields

-- Add new columns to badge_definitions
ALTER TABLE badge_definitions
  ADD COLUMN IF NOT EXISTS verification_requirements JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_hireable_signal BOOLEAN DEFAULT false;

-- Add 'skills' to badge categories (extend the existing category options)
-- Note: category is a VARCHAR field, so new values are already supported

-- Insert skill-based authority badge definitions
INSERT INTO badge_definitions (code, name, description, category, icon, stat_key, max_level, levels, verification_requirements, is_hireable_signal)
VALUES
  ('skill_javascript', 'JavaScript Authority', 'Verified JavaScript expertise through assessments and peer endorsements', 'skills', 'SiJavascript', 'verified_skill_javascript', 5,
   '[
     {"level": 1, "name": "JS Beginner", "tier": "bronze", "requirement": 1, "points": 50},
     {"level": 2, "name": "JS Practitioner", "tier": "silver", "requirement": 2, "points": 100},
     {"level": 3, "name": "JS Developer", "tier": "gold", "requirement": 3, "points": 200},
     {"level": 4, "name": "JS Expert", "tier": "platinum", "requirement": 5, "points": 400},
     {"level": 5, "name": "JS Authority", "tier": "diamond", "requirement": 8, "points": 800}
   ]',
   '{"assessment_min_score": 70, "endorsements_required": [0, 1, 3, 5, 10], "study_hours_required": [0, 10, 50, 100, 200]}',
   true),

  ('skill_typescript', 'TypeScript Authority', 'Verified TypeScript expertise through assessments and peer endorsements', 'skills', 'SiTypescript', 'verified_skill_typescript', 5,
   '[
     {"level": 1, "name": "TS Beginner", "tier": "bronze", "requirement": 1, "points": 50},
     {"level": 2, "name": "TS Practitioner", "tier": "silver", "requirement": 2, "points": 100},
     {"level": 3, "name": "TS Developer", "tier": "gold", "requirement": 3, "points": 200},
     {"level": 4, "name": "TS Expert", "tier": "platinum", "requirement": 5, "points": 400},
     {"level": 5, "name": "TS Authority", "tier": "diamond", "requirement": 8, "points": 800}
   ]',
   '{"assessment_min_score": 70, "endorsements_required": [0, 1, 3, 5, 10], "study_hours_required": [0, 10, 50, 100, 200]}',
   true),

  ('skill_react', 'React Authority', 'Verified React expertise through assessments and peer endorsements', 'skills', 'SiReact', 'verified_skill_react', 5,
   '[
     {"level": 1, "name": "React Beginner", "tier": "bronze", "requirement": 1, "points": 50},
     {"level": 2, "name": "React Practitioner", "tier": "silver", "requirement": 2, "points": 100},
     {"level": 3, "name": "React Developer", "tier": "gold", "requirement": 3, "points": 200},
     {"level": 4, "name": "React Expert", "tier": "platinum", "requirement": 5, "points": 400},
     {"level": 5, "name": "React Authority", "tier": "diamond", "requirement": 8, "points": 800}
   ]',
   '{"assessment_min_score": 70, "endorsements_required": [0, 1, 3, 5, 10], "study_hours_required": [0, 10, 50, 100, 200]}',
   true),

  ('skill_nodejs', 'Node.js Authority', 'Verified Node.js expertise through assessments and peer endorsements', 'skills', 'SiNodedotjs', 'verified_skill_nodejs', 5,
   '[
     {"level": 1, "name": "Node Beginner", "tier": "bronze", "requirement": 1, "points": 50},
     {"level": 2, "name": "Node Practitioner", "tier": "silver", "requirement": 2, "points": 100},
     {"level": 3, "name": "Node Developer", "tier": "gold", "requirement": 3, "points": 200},
     {"level": 4, "name": "Node Expert", "tier": "platinum", "requirement": 5, "points": 400},
     {"level": 5, "name": "Node Authority", "tier": "diamond", "requirement": 8, "points": 800}
   ]',
   '{"assessment_min_score": 70, "endorsements_required": [0, 1, 3, 5, 10], "study_hours_required": [0, 10, 50, 100, 200]}',
   true),

  ('skill_python', 'Python Authority', 'Verified Python expertise through assessments and peer endorsements', 'skills', 'SiPython', 'verified_skill_python', 5,
   '[
     {"level": 1, "name": "Python Beginner", "tier": "bronze", "requirement": 1, "points": 50},
     {"level": 2, "name": "Python Practitioner", "tier": "silver", "requirement": 2, "points": 100},
     {"level": 3, "name": "Python Developer", "tier": "gold", "requirement": 3, "points": 200},
     {"level": 4, "name": "Python Expert", "tier": "platinum", "requirement": 5, "points": 400},
     {"level": 5, "name": "Python Authority", "tier": "diamond", "requirement": 8, "points": 800}
   ]',
   '{"assessment_min_score": 70, "endorsements_required": [0, 1, 3, 5, 10], "study_hours_required": [0, 10, 50, 100, 200]}',
   true),

  ('skill_sql', 'SQL Authority', 'Verified SQL expertise through assessments and peer endorsements', 'skills', 'Database', 'verified_skill_sql', 5,
   '[
     {"level": 1, "name": "SQL Beginner", "tier": "bronze", "requirement": 1, "points": 50},
     {"level": 2, "name": "SQL Practitioner", "tier": "silver", "requirement": 2, "points": 100},
     {"level": 3, "name": "SQL Developer", "tier": "gold", "requirement": 3, "points": 200},
     {"level": 4, "name": "SQL Expert", "tier": "platinum", "requirement": 5, "points": 400},
     {"level": 5, "name": "SQL Authority", "tier": "diamond", "requirement": 8, "points": 800}
   ]',
   '{"assessment_min_score": 70, "endorsements_required": [0, 1, 3, 5, 10], "study_hours_required": [0, 10, 50, 100, 200]}',
   true)
ON CONFLICT (code) DO NOTHING;
