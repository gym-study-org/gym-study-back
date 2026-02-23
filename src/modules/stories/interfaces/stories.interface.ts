export type StoryContentType = 'text' | 'image' | 'study_update' | 'achievement';

export interface Story {
  id: string;
  user_id: string;
  content_type: StoryContentType;
  content: string | null;
  media_url: string | null;
  metadata: Record<string, unknown>;
  background_color: string;
  views_count: number;
  expires_at: string;
  created_at: string;
}

export interface StoryWithAuthor extends Story {
  author_username: string;
  author_avatar_url: string | null;
  is_viewed_by_me: boolean;
}

export interface UserStoriesGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: StoryWithAuthor[];
  has_unviewed: boolean;
}

export interface CreateStoryDTO {
  content_type?: StoryContentType;
  content?: string;
  media_url?: string;
  metadata?: Record<string, unknown>;
  background_color?: string;
}

export interface ProfileViewStats {
  total_views_7d: number;
  total_views_30d: number;
  recent_viewers: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    viewed_at: string;
  }[];
}
