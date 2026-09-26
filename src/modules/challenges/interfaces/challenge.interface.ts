export type ChallengeType = 'hours' | 'sessions' | 'streak' | 'certifications';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface Challenge {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  challenge_type: ChallengeType;
  target_value: number;
  status: ChallengeStatus;
  start_date: string;
  end_date: string;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  invitation_status: InvitationStatus;
  current_value: number;
  position: number | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeWithDetails extends Challenge {
  creator_name: string;
  creator_avatar_url: string | null;
  participants_count: number;
  my_progress: number;
  my_status: InvitationStatus;
}

export interface ParticipantWithUser extends ChallengeParticipant {
  user_name: string;
  user_avatar_url: string | null;
}

export interface CreateChallengeInput {
  title: string;
  description?: string;
  challenge_type: ChallengeType;
  target_value: number;
  start_date: string;
  end_date: string;
  invited_friends: string[]; // Array of user IDs
}

export interface UpdateChallengeInput {
  title?: string;
  description?: string;
  target_value?: number;
  start_date?: string;
  end_date?: string;
}
