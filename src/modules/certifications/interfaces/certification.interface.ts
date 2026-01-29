export interface Certification {
  id: string;
  user_id: string;
  name: string;
  provider: string | null;
  category: string | null;
  description: string | null;
  score: number | null;
  max_score: number | null;
  passed: boolean;
  obtained_at: string;
  expires_at: string | null;
  credential_id: string | null;
  credential_url: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCertificationInput {
  name: string;
  provider?: string;
  category?: string;
  description?: string;
  score?: number;
  max_score?: number;
  passed?: boolean;
  obtained_at: string;
  expires_at?: string;
  credential_id?: string;
  credential_url?: string;
  tags?: string[];
}

export interface UpdateCertificationInput {
  name?: string;
  provider?: string;
  category?: string;
  description?: string;
  score?: number;
  max_score?: number;
  passed?: boolean;
  obtained_at?: string;
  expires_at?: string;
  credential_id?: string;
  credential_url?: string;
  tags?: string[];
}
