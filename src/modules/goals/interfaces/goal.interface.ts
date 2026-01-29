export type GoalTargetType = 'hours' | 'sessions' | 'certifications' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  target_type: GoalTargetType;
  target_value: number;
  current_value: number;
  status: GoalStatus;
  completed_at: string | null;
  start_date: string;
  end_date: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  category?: string;
  target_type: GoalTargetType;
  target_value: number;
  current_value?: number;
  start_date: string;
  end_date?: string;
  tags?: string[];
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  category?: string;
  target_type?: GoalTargetType;
  target_value?: number;
  current_value?: number;
  status?: GoalStatus;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}
