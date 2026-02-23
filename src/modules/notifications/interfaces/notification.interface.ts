export type NotificationType =
  | 'friendship_request'
  | 'friendship_accepted'
  | 'post_liked'
  | 'post_commented'
  | 'badge_level_up'
  | 'achievement_unlocked'
  | 'challenge_invite'
  | 'challenge_completed'
  | 'endorsement_received'
  | 'streak_warning'
  | 'weekly_summary'
  | 'mention';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface NotificationWithActor extends Notification {
  actor_username: string | null;
  actor_avatar_url: string | null;
}

export interface CreateNotificationDTO {
  user_id: string;
  actor_id?: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  reference_type?: string;
  reference_id?: string;
}

export interface NotificationQuery {
  limit: number;
  cursor?: string;
  unread_only?: boolean;
}
