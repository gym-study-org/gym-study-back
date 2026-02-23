import { pool } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import { getCacheOrFetch, deleteCache } from '../../../shared/utils/cache.util';
import {
  GitHubConnection,
  GitHubStats,
  GitHubUserResponse,
  GitHubRepoResponse,
} from '../interfaces/github.interface';
import { logger } from '../../../shared/utils/logger.util';

const GITHUB_API = 'https://api.github.com';

async function githubFetch<T>(endpoint: string, token: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'GYM-STUDY-Backend',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new AppError('GitHub token is invalid or expired', 401, 'GITHUB_AUTH_FAILED');
    }
    throw new AppError(`GitHub API error: ${response.status}`, response.status, 'GITHUB_API_ERROR');
  }

  return response.json() as Promise<T>;
}

export class GitHubService {
  static async connect(userId: string, accessToken: string): Promise<GitHubStats> {
    // Validate token by fetching user info
    const ghUser = await githubFetch<GitHubUserResponse>('/user', accessToken);

    // Check if already connected
    const existing = await pool.query(
      'SELECT id FROM github_connections WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      // Update existing connection
      await pool.query(
        `UPDATE github_connections
         SET github_username = $1, github_id = $2, access_token = $3,
             public_repos = $4, followers = $5, profile_url = $6,
             avatar_url = $7, updated_at = NOW()
         WHERE user_id = $8`,
        [
          ghUser.login, String(ghUser.id), accessToken,
          ghUser.public_repos, ghUser.followers, ghUser.html_url,
          ghUser.avatar_url, userId,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO github_connections
         (user_id, github_username, github_id, access_token, public_repos, followers, profile_url, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId, ghUser.login, String(ghUser.id), accessToken,
          ghUser.public_repos, ghUser.followers, ghUser.html_url,
          ghUser.avatar_url,
        ]
      );
    }

    // Sync stats immediately
    return this.syncStats(userId);
  }

  static async getMyStats(userId: string): Promise<GitHubStats> {
    const cacheKey = `github:stats:${userId}`;

    return getCacheOrFetch(cacheKey, async () => {
      const result = await pool.query<GitHubConnection>(
        `SELECT github_username, public_repos, followers, commits_30d,
                contributions_year, primary_languages, profile_url, last_synced_at
         FROM github_connections WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('GitHub account not connected', 404, 'GITHUB_NOT_CONNECTED');
      }

      const conn = result.rows[0];
      return {
        github_username: conn.github_username,
        public_repos: conn.public_repos,
        followers: conn.followers,
        commits_30d: conn.commits_30d,
        contributions_year: conn.contributions_year,
        primary_languages: conn.primary_languages,
        profile_url: conn.profile_url,
        last_synced_at: conn.last_synced_at,
      };
    }, 300);
  }

  static async getUserStats(userId: string): Promise<GitHubStats | null> {
    const cacheKey = `github:stats:${userId}`;

    return getCacheOrFetch(cacheKey, async () => {
      const result = await pool.query<GitHubConnection>(
        `SELECT github_username, public_repos, followers, commits_30d,
                contributions_year, primary_languages, profile_url, last_synced_at
         FROM github_connections WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const conn = result.rows[0];
      return {
        github_username: conn.github_username,
        public_repos: conn.public_repos,
        followers: conn.followers,
        commits_30d: conn.commits_30d,
        contributions_year: conn.contributions_year,
        primary_languages: conn.primary_languages,
        profile_url: conn.profile_url,
        last_synced_at: conn.last_synced_at,
      };
    }, 300);
  }

  static async syncStats(userId: string): Promise<GitHubStats> {
    const connResult = await pool.query<GitHubConnection>(
      'SELECT * FROM github_connections WHERE user_id = $1',
      [userId]
    );

    if (connResult.rows.length === 0) {
      throw new AppError('GitHub account not connected', 404, 'GITHUB_NOT_CONNECTED');
    }

    const conn = connResult.rows[0];
    const token = conn.access_token;

    // Fetch user profile
    const ghUser = await githubFetch<GitHubUserResponse>('/user', token);

    // Fetch repos to determine primary languages
    const repos = await githubFetch<GitHubRepoResponse[]>(
      '/user/repos?sort=updated&per_page=100&type=owner',
      token
    );

    // Count languages
    const langCounts = new Map<string, number>();
    for (const repo of repos) {
      if (repo.language) {
        langCounts.set(repo.language, (langCounts.get(repo.language) || 0) + 1);
      }
    }
    const primaryLanguages = [...langCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    // Estimate recent commits via events API (last 90 days, limited to 300 events)
    let commits30d = 0;
    try {
      const events = await githubFetch<Array<{ type: string; created_at: string }>>(
        `/users/${ghUser.login}/events?per_page=100`,
        token
      );
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      commits30d = events.filter(
        (e) => e.type === 'PushEvent' && new Date(e.created_at) > thirtyDaysAgo
      ).length;
    } catch {
      logger.debug('Could not fetch GitHub events for commit count');
    }

    // Update database
    await pool.query(
      `UPDATE github_connections
       SET github_username = $1, public_repos = $2, followers = $3,
           commits_30d = $4, primary_languages = $5, profile_url = $6,
           avatar_url = $7, last_synced_at = NOW(), updated_at = NOW()
       WHERE user_id = $8`,
      [
        ghUser.login, ghUser.public_repos, ghUser.followers,
        commits30d, JSON.stringify(primaryLanguages), ghUser.html_url,
        ghUser.avatar_url, userId,
      ]
    );

    // Invalidate cache
    await deleteCache(`github:stats:${userId}`);

    return {
      github_username: ghUser.login,
      public_repos: ghUser.public_repos,
      followers: ghUser.followers,
      commits_30d: commits30d,
      contributions_year: 0,
      primary_languages: primaryLanguages,
      profile_url: ghUser.html_url,
      last_synced_at: new Date(),
    };
  }

  static async disconnect(userId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM github_connections WHERE user_id = $1',
      [userId]
    );
    if ((result.rowCount || 0) === 0) {
      throw new AppError('GitHub account not connected', 404, 'GITHUB_NOT_CONNECTED');
    }
    await deleteCache(`github:stats:${userId}`);
  }

  static async getAllConnections(): Promise<Array<{ user_id: string; access_token: string }>> {
    const result = await pool.query(
      'SELECT user_id, access_token FROM github_connections'
    );
    return result.rows;
  }
}
