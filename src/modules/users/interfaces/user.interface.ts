export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  total_study_hours: number;
  current_streak: number;
  longest_streak: number;
  member_since: string;
  certifications: UserCertification[];
  is_friend: boolean;
  friendship_status: 'accepted' | 'pending' | 'none';
}

export interface UserCertification {
  id: string;
  name: string;
  provider: string | null;
  category: string | null;
  passed: boolean;
  obtained_at: string;
  credential_url: string | null;
}

export interface UpdateUserInput {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
}
