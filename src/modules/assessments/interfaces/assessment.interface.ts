export interface SkillCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentQuestion {
  id: string;
  skill_category_id: string;
  question: string;
  question_type: 'multiple_choice' | 'code_output' | 'true_false';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  options: QuestionOption[];
  correct_answer: number;
  explanation: string | null;
  time_limit_seconds: number;
  is_active: boolean;
}

export interface QuestionOption {
  text: string;
}

export type AttemptStatus = 'in_progress' | 'completed' | 'expired' | 'abandoned';

export interface AssessmentAttempt {
  id: string;
  user_id: string;
  skill_category_id: string;
  status: AttemptStatus;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score: number;
  passed: boolean;
  answers: AnswerRecord[];
  question_ids: string[];
  current_question_index: number;
  time_limit_minutes: number;
  started_at: Date;
  completed_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AnswerRecord {
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
  answered_at: string;
}

export interface VerifiedSkill {
  id: string;
  user_id: string;
  skill_category_id: string;
  verification_type: 'assessment' | 'peer_endorsement' | 'github_validation';
  assessment_attempt_id: string | null;
  score: number | null;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsement_count: number;
  verified_at: Date;
  expires_at: Date;
  is_active: boolean;
}

export interface VerifiedSkillWithCategory extends VerifiedSkill {
  skill_code: string;
  skill_name: string;
  skill_icon: string;
}

export interface PeerEndorsement {
  id: string;
  endorser_id: string;
  endorsed_id: string;
  skill_category_id: string;
  message: string | null;
  created_at: Date;
}

export interface PeerEndorsementWithDetails extends PeerEndorsement {
  endorser_username: string;
  endorser_avatar_url: string | null;
  skill_code: string;
  skill_name: string;
}

// DTOs

export interface StartAssessmentDTO {
  total_questions?: number;
  time_limit_minutes?: number;
}

export interface AnswerQuestionDTO {
  selected_answer: number;
}

export interface EndorseSkillDTO {
  message?: string;
}

// Response types

export interface AssessmentStartResponse {
  attempt_id: string;
  skill: { code: string; name: string };
  total_questions: number;
  time_limit_minutes: number;
  expires_at: string;
  first_question: QuestionForClient;
}

export interface QuestionForClient {
  id: string;
  question: string;
  question_type: string;
  difficulty: string;
  options: QuestionOption[];
  time_limit_seconds: number;
  question_number: number;
  total_questions: number;
}

export interface AnswerResponse {
  is_correct: boolean;
  correct_answer: number;
  explanation: string | null;
  next_question: QuestionForClient | null;
  progress: {
    answered: number;
    total: number;
    correct: number;
  };
}

export interface AssessmentResult {
  attempt_id: string;
  skill: { code: string; name: string };
  score: number;
  passed: boolean;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  level_achieved: string | null;
  verified_skill_created: boolean;
}
