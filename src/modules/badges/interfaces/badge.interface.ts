export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type BadgeCategory =
  | 'study_hours'
  | 'streak'
  | 'social'
  | 'certifications'
  | 'goals'
  | 'sessions'
  | 'special';

export interface BadgeLevel {
  level: number;
  requirement: number;
  points: number;
  name: string;
  tier: BadgeTier;
}

export interface BadgeDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  stat_key: string;
  max_level: number;
  levels: BadgeLevel[];
  created_at: Date;
  updated_at: Date;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  current_level: number;
  current_value: number;
  total_points_earned: number;
  first_unlocked_at: Date | null;
  last_level_up_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserBadgeWithDefinition extends UserBadge {
  badge: BadgeDefinition;
  next_level: BadgeLevel | null;
  progress_percentage: number;
  is_max_level: boolean;
  current_level_info: BadgeLevel | null;
}

export interface BadgeLevelUpEvent {
  badge: BadgeDefinition;
  from_level: number;
  to_level: number;
  level_info: BadgeLevel;
  points_earned: number;
  new_total_points: number;
}

export interface UserBadgesResponse {
  badges: UserBadgeWithDefinition[];
  total_points: number;
  total_levels_unlocked: number;
  max_possible_levels: number;
}

export interface BadgeCategoryStats {
  category: BadgeCategory;
  label: string;
  icon: string;
  badges: UserBadgeWithDefinition[];
  total_levels: number;
  unlocked_levels: number;
  points_earned: number;
  max_points: number;
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

// Constants
export const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

export const TIER_ORDER: Record<BadgeTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  diamond: 5,
};

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  study_hours: 'Horas de Estudo',
  streak: 'Sequência',
  social: 'Social',
  certifications: 'Certificações',
  goals: 'Metas',
  sessions: 'Sessões',
  special: 'Especiais',
};

export const CATEGORY_ICONS: Record<BadgeCategory, string> = {
  study_hours: 'GraduationCap',
  streak: 'Flame',
  social: 'Users',
  certifications: 'Award',
  goals: 'Target',
  sessions: 'Swords',
  special: 'Sparkles',
};

// Stat key to user property mapping
export const STAT_KEY_MAP: Record<string, keyof UserStats> = {
  total_study_hours: 'total_study_hours',
  longest_streak: 'longest_streak',
  friends_count: 'friends_count',
  certifications_count: 'certifications_count',
  completed_goals_count: 'completed_goals_count',
  sessions_count: 'sessions_count',
};
