export type RelationshipType = 'study_partner' | 'mentor' | 'colleague';

export interface Recommendation {
  id: string;
  author_id: string;
  recipient_id: string;
  relationship: RelationshipType;
  content: string;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RecommendationWithAuthor extends Recommendation {
  author_username: string;
  author_avatar_url: string | null;
  author_level: number;
}

export interface CreateRecommendationDTO {
  recipient_id: string;
  relationship: RelationshipType;
  content: string;
}

export interface UpdateRecommendationDTO {
  content?: string;
  is_visible?: boolean;
}
