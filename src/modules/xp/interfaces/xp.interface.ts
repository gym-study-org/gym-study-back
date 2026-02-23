export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  source_id: string | null;
  multiplier: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface XPRule {
  id: string;
  source: string;
  base_amount: number;
  description_pt: string;
  is_active: boolean;
}

export interface XPSummary {
  total_xp: number;
  weekly_xp: number;
  level: number;
  next_level_xp: number;
  xp_to_next_level: number;
  level_progress_percent: number;
}

export interface AwardXPData {
  userId: string;
  source: string;
  sourceId?: string;
  multiplier?: number;
  metadata?: Record<string, unknown>;
}
