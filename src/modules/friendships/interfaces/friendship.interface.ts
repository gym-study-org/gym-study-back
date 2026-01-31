export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
}

export interface FriendshipWithUser extends Friendship {
  friend_id: string;
  friend_name: string;
  friend_email: string;
  friend_avatar_url: string | null;
  friend_total_study_hours: number;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  requester_avatar_url: string | null;
  created_at: string;
}

export interface CreateFriendshipInput {
  addressee_id: string;
}

export interface UpdateFriendshipInput {
  status: FriendshipStatus;
}
