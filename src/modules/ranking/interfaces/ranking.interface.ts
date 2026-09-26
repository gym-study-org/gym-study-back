export interface RankingEntry {
  position: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_study_hours: number;
  total_sessions: number;
  total_certifications: number;
  current_streak: number;
  is_friend: boolean;
  is_current_user: boolean;
}

export interface RankingPeriod {
  period: 'all_time' | 'monthly' | 'weekly' | 'daily';
  start_date?: string;
  end_date?: string;
}

export interface UserRankingPosition {
  global_position: number;
  total_users: number;
  friends_position: number;
  total_friends: number;
}
