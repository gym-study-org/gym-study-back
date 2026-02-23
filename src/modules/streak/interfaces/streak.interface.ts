export interface StreakStatus {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  streak_freezes_available: number;
  streak_freeze_used_today: boolean;
  next_milestone: StreakMilestoneInfo | null;
  milestones_achieved: number[];
}

export interface StreakMilestoneInfo {
  days: number;
  days_remaining: number;
  xp_reward: number;
}

export const STREAK_MILESTONES = [7, 30, 50, 100, 200, 365, 500, 1000];

export const STREAK_MILESTONE_XP: Record<number, string> = {
  7: 'streak_bonus_7',
  30: 'streak_bonus_30',
  50: 'streak_bonus_50',
  100: 'streak_bonus_100',
  200: 'streak_bonus_200',
  365: 'streak_bonus_365',
};

export const STREAK_FREEZE_COST_GEMS = 200;
export const MAX_STREAK_FREEZES = 2;
