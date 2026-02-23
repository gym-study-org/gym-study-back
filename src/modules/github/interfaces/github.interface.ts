export interface GitHubConnection {
  id: string;
  user_id: string;
  github_username: string;
  github_id: string | null;
  access_token: string;
  public_repos: number;
  followers: number;
  commits_30d: number;
  contributions_year: number;
  primary_languages: string[];
  profile_url: string | null;
  avatar_url: string | null;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface GitHubStats {
  github_username: string;
  public_repos: number;
  followers: number;
  commits_30d: number;
  contributions_year: number;
  primary_languages: string[];
  profile_url: string | null;
  last_synced_at: Date | null;
}

export interface GitHubUserResponse {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
}

export interface GitHubRepoResponse {
  name: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}
