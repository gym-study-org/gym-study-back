export interface League {
  id: string;
  tier: number;
  name: string;
  name_pt: string;
  icon: string;
  color: string;
  promotion_slots: number;
  demotion_slots: number;
  created_at: string;
}

export interface LeagueMembership {
  id: string;
  user_id: string;
  league_id: string;
  season_week: string;
  group_number: number;
  weekly_xp: number;
  position: number | null;
  promoted: boolean;
  demoted: boolean;
  created_at: string;
}

export interface LeagueMemberRanking {
  user_id: string;
  username: string;
  avatar_url: string | null;
  weekly_xp: number;
  position: number;
  level: number;
}

export interface CurrentLeagueResponse {
  league: League;
  season_week: string;
  my_position: number | null;
  my_weekly_xp: number;
  members: LeagueMemberRanking[];
  promotion_zone: number; // positions 1..N are promoted
  demotion_zone: number;  // last N positions are demoted
  total_members: number;
}

export interface LeagueHistoryEntry {
  season_week: string;
  league_name_pt: string;
  league_tier: number;
  league_color: string;
  final_position: number;
  final_xp: number;
  promoted: boolean;
  demoted: boolean;
}
