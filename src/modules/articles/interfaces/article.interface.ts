export type ArticleStatus = 'draft' | 'published';

export interface Article {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  status: ArticleStatus;
  published_at: Date | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  reading_time_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface ArticleWithAuthor extends Article {
  author_username: string;
  author_full_name: string | null;
  author_avatar_url: string | null;
  author_level: number;
  is_liked_by_me?: boolean;
}

export interface CreateArticleDTO {
  title: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  tags?: string[];
}

export interface UpdateArticleDTO {
  title?: string;
  content?: string;
  excerpt?: string;
  cover_image_url?: string;
  tags?: string[];
}

export interface ArticleQuery {
  limit: number;
  cursor?: string;
  tag?: string;
  status?: ArticleStatus;
}
