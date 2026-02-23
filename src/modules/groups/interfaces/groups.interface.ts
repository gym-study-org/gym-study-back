export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  owner_id: string;
  avatar_url: string | null;
  max_members: number;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyGroupWithDetails extends StudyGroup {
  members_count: number;
  owner_username: string;
  owner_avatar_url: string | null;
  my_role: string | null; // null if not a member
}

export interface StudyGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface StudyGroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'system' | 'study_share';
  metadata: Record<string, unknown>;
  created_at: string;
  author_username: string;
  author_avatar_url: string | null;
}

export interface CreateGroupDTO {
  name: string;
  description?: string;
  subject?: string;
  is_public?: boolean;
  max_members?: number;
}

export interface UpdateGroupDTO {
  name?: string;
  description?: string;
  subject?: string;
  is_public?: boolean;
  max_members?: number;
}

export interface SendMessageDTO {
  content: string;
  message_type?: 'text' | 'study_share';
  metadata?: Record<string, unknown>;
}
