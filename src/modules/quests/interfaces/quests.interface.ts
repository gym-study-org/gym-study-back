export interface QuestTemplate {
  id: string;
  quest_type: string;
  tier: 'bronze' | 'silver' | 'gold';
  title_pt: string;
  description_pt: string;
  target_value: number;
  xp_reward: number;
  is_active: boolean;
}

export interface UserDailyQuest {
  id: string;
  user_id: string;
  quest_template_id: string;
  quest_date: string;
  current_progress: number;
  target_value: number;
  is_completed: boolean;
  completed_at: string | null;
  xp_claimed: boolean;
  claimed_at: string | null;
  // Joined from quest_templates
  quest_type: string;
  tier: 'bronze' | 'silver' | 'gold';
  title_pt: string;
  description_pt: string;
  xp_reward: number;
}

export type QuestType = 'study_minutes' | 'study_sessions' | 'earn_xp' | 'post_in_feed' | 'comment_on_post';
