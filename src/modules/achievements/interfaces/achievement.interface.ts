export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type AchievementCategory =
  | 'study_hours'
  | 'streak'
  | 'social'
  | 'certifications'
  | 'goals'
  | 'sessions'
  | 'special';

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  requirement_value: number;
  points: number;
  created_at: Date;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: Date;
}

export interface AchievementWithUnlockStatus extends Achievement {
  unlocked: boolean;
  unlocked_at: Date | null;
}

export interface UserStats {
  total_study_hours: number;
  current_streak: number;
  longest_streak: number;
  sessions_count: number;
  certifications_count: number;
  completed_goals_count: number;
  friends_count: number;
}

export interface UnlockedAchievementResponse {
  achievement: Achievement;
  unlocked_at: Date;
}

export interface AchievementListResponse {
  achievements: AchievementWithUnlockStatus[];
  total_points: number;
  unlocked_count: number;
  total_count: number;
}

export interface AchievementCategoryStats {
  category: AchievementCategory;
  label: string;
  unlocked: number;
  total: number;
  points_earned: number;
  max_points: number;
}

export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

export const TIER_MULTIPLIERS: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 1.5,
  gold: 2,
  platinum: 3,
  diamond: 5,
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  study_hours: 'Horas de Estudo',
  streak: 'Sequencia',
  social: 'Social',
  certifications: 'Certificacoes',
  goals: 'Metas',
  sessions: 'Sessoes',
  special: 'Especiais',
};
