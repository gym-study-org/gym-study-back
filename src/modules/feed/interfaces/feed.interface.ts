export type PostType =
  | 'text'
  | 'study_output'
  | 'certification_share'
  | 'achievement_share'
  | 'challenge_complete'
  | 'milestone'
  | 'code_snippet'
  | 'poll';

export type PostVisibility = 'public' | 'friends' | 'private';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  post_type: PostType;
  media_urls: string[];
  study_session_id: string | null;
  certification_id: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  visibility: PostVisibility;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PostWithAuthor extends Post {
  author_username: string;
  author_full_name: string | null;
  author_avatar_url: string | null;
  is_liked_by_me: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CommentWithAuthor extends Comment {
  author_username: string;
  author_avatar_url: string | null;
  is_liked_by_me: boolean;
  replies?: CommentWithAuthor[];
}

export interface CreatePostDTO {
  content: string;
  post_type?: PostType;
  media_urls?: string[];
  study_session_id?: string;
  certification_id?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  visibility?: PostVisibility;
}

export interface UpdatePostDTO {
  content?: string;
  media_urls?: string[];
  tags?: string[];
  visibility?: PostVisibility;
}

export interface CreateCommentDTO {
  content: string;
  parent_id?: string;
}

export interface FeedQuery {
  limit: number;
  cursor?: string;
  filter?: PostType;
}

export interface PostWithComments extends PostWithAuthor {
  comments: CommentWithAuthor[];
}
