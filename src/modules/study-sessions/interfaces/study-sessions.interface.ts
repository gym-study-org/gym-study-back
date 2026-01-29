export interface StudySession {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  description: string | null;
  duration_minutes: number;
  is_for_certification: boolean;
  certification_name: string | null;
  tags: string[] | null;
  started_at: Date;
  finished_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateStudySessionDTO {
  title: string;
  subject: string;
  description?: string;
  duration_minutes: number;
  is_for_certification?: boolean;
  certification_name?: string;
  tags?: string[];
  started_at: string;
  finished_at: string;
}

export interface UpdateStudySessionDTO {
  title?: string;
  subject?: string;
  description?: string;
  is_for_certification?: boolean;
  certification_name?: string;
  tags?: string[];
}

export interface StudySessionStats {
  total_sessions: number;
  total_hours: number;
  total_minutes: number;
  subjects: {
    subject: string;
    count: number;
    total_minutes: number;
  }[];
  recent_sessions: StudySession[];
}
