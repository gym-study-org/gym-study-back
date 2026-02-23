import { query } from '../../../config/database';
import { pool } from '../../../config/database';
import { logger } from '../../../shared/utils/logger.util';
import { getCacheOrFetch, deleteCachePattern } from '../../../shared/utils/cache.util';
import {
  League,
  CurrentLeagueResponse,
  LeagueHistoryEntry,
  LeagueMemberRanking,
} from '../interfaces/leagues.interface';

export class LeaguesService {
  /**
   * Get all league tiers info
   */
  static async getAllLeagues(): Promise<League[]> {
    return getCacheOrFetch('leagues:all', async () => {
      const result = await query('SELECT * FROM leagues ORDER BY tier ASC');
      return result.rows;
    }, 3600);
  }

  /**
   * Get current league for user with group ranking
   */
  static async getCurrentLeague(userId: string): Promise<CurrentLeagueResponse | null> {
    const seasonWeek = getSeasonWeek();

    // Get or create membership for this week
    let membership = await this.getOrCreateMembership(userId, seasonWeek);

    // Get league info
    const leagueResult = await query('SELECT * FROM leagues WHERE id = $1', [membership.league_id]);
    if (leagueResult.rows.length === 0) return null;
    const league = leagueResult.rows[0];

    // Get all members in same group with user info, ordered by weekly_xp
    const membersResult = await query(
      `SELECT lm.user_id, u.username, u.avatar_url, lm.weekly_xp, u.level
       FROM league_memberships lm
       JOIN users u ON u.id = lm.user_id
       WHERE lm.league_id = $1 AND lm.season_week = $2 AND lm.group_number = $3
       ORDER BY lm.weekly_xp DESC, lm.created_at ASC`,
      [membership.league_id, seasonWeek, membership.group_number]
    );

    // Calculate positions
    const members: LeagueMemberRanking[] = membersResult.rows.map((row: any, idx: number) => ({
      user_id: row.user_id,
      username: row.username,
      avatar_url: row.avatar_url,
      weekly_xp: row.weekly_xp,
      position: idx + 1,
      level: row.level,
    }));

    const myMember = members.find(m => m.user_id === userId);

    return {
      league,
      season_week: seasonWeek,
      my_position: myMember?.position ?? null,
      my_weekly_xp: myMember?.weekly_xp ?? 0,
      members,
      promotion_zone: league.promotion_slots,
      demotion_zone: league.demotion_slots,
      total_members: members.length,
    };
  }

  /**
   * Get or create a league membership for the user in the given week
   */
  static async getOrCreateMembership(userId: string, seasonWeek: string) {
    // Check if membership exists for this week
    const existing = await query(
      'SELECT * FROM league_memberships WHERE user_id = $1 AND season_week = $2',
      [userId, seasonWeek]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Get user's current league tier
    const userResult = await query('SELECT current_league_tier FROM users WHERE id = $1', [userId]);
    const currentTier = userResult.rows.length > 0 ? (userResult.rows[0].current_league_tier || 1) : 1;

    // Get league for this tier
    const leagueResult = await query('SELECT id FROM leagues WHERE tier = $1', [currentTier]);
    if (leagueResult.rows.length === 0) {
      // Fallback to Bronze
      const bronze = await query('SELECT id FROM leagues WHERE tier = 1');
      return this.assignToGroup(userId, bronze.rows[0].id, seasonWeek);
    }

    return this.assignToGroup(userId, leagueResult.rows[0].id, seasonWeek);
  }

  /**
   * Assign user to a group (max 30 per group)
   */
  private static async assignToGroup(userId: string, leagueId: string, seasonWeek: string) {
    // Find a group with less than 30 members
    const groupResult = await query(
      `SELECT group_number, COUNT(*) as cnt
       FROM league_memberships
       WHERE league_id = $1 AND season_week = $2
       GROUP BY group_number
       HAVING COUNT(*) < 30
       ORDER BY group_number ASC
       LIMIT 1`,
      [leagueId, seasonWeek]
    );

    let groupNumber = 1;
    if (groupResult.rows.length > 0) {
      groupNumber = groupResult.rows[0].group_number;
    } else {
      // All groups are full or no groups exist — create a new one
      const maxGroup = await query(
        `SELECT COALESCE(MAX(group_number), 0) as max_group
         FROM league_memberships
         WHERE league_id = $1 AND season_week = $2`,
        [leagueId, seasonWeek]
      );
      groupNumber = maxGroup.rows[0].max_group + 1;
    }

    // Get user's current weekly_xp
    const userXp = await query('SELECT weekly_xp FROM users WHERE id = $1', [userId]);
    const weeklyXp = userXp.rows.length > 0 ? (userXp.rows[0].weekly_xp || 0) : 0;

    const result = await query(
      `INSERT INTO league_memberships (user_id, league_id, season_week, group_number, weekly_xp)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, season_week) DO NOTHING
       RETURNING *`,
      [userId, leagueId, seasonWeek, groupNumber, weeklyXp]
    );

    if (result.rows.length === 0) {
      // Conflict: already exists, re-fetch
      const existing = await query(
        'SELECT * FROM league_memberships WHERE user_id = $1 AND season_week = $2',
        [userId, seasonWeek]
      );
      return existing.rows[0];
    }

    return result.rows[0];
  }

  /**
   * Sync weekly_xp from users table into league_memberships
   * Called periodically or when XP is awarded
   */
  static async syncUserXP(userId: string): Promise<void> {
    const seasonWeek = getSeasonWeek();
    await query(
      `UPDATE league_memberships lm
       SET weekly_xp = u.weekly_xp
       FROM users u
       WHERE lm.user_id = u.id AND lm.user_id = $1 AND lm.season_week = $2`,
      [userId, seasonWeek]
    );
  }

  /**
   * Get league history for a user
   */
  static async getHistory(
    userId: string,
    options: { limit: number; cursor?: string }
  ): Promise<{ history: LeagueHistoryEntry[]; next_cursor: string | null }> {
    const { limit, cursor } = options;
    let sql = `SELECT lh.season_week, l.name_pt as league_name_pt, l.tier as league_tier,
                      l.color as league_color, lh.final_position, lh.final_xp,
                      lh.promoted, lh.demoted
               FROM league_history lh
               JOIN leagues l ON l.id = lh.league_id
               WHERE lh.user_id = $1`;
    const params: any[] = [userId];
    let paramIdx = 2;

    if (cursor) {
      sql += ` AND lh.season_week < $${paramIdx++}`;
      params.push(cursor);
    }

    sql += ` ORDER BY lh.season_week DESC LIMIT $${paramIdx}`;
    params.push(limit + 1);

    const result = await query(sql, params);
    const history = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;
    const next_cursor = hasMore && history.length > 0
      ? history[history.length - 1].season_week
      : null;

    return { history, next_cursor };
  }

  /**
   * Process end-of-week: calculate positions, promote/demote, archive to history
   * Called by league-promotion cron job
   */
  static async processWeeklyPromotion(): Promise<void> {
    const lastWeek = getSeasonWeek(-1);
    const newWeek = getSeasonWeek();

    logger.info(`Processing league promotions for week ${lastWeek} -> ${newWeek}`);

    // Get all leagues
    const leagues = await query('SELECT * FROM leagues ORDER BY tier ASC');

    for (const league of leagues.rows) {
      // Get all groups in this league for last week
      const groups = await query(
        `SELECT DISTINCT group_number FROM league_memberships
         WHERE league_id = $1 AND season_week = $2`,
        [league.id, lastWeek]
      );

      for (const group of groups.rows) {
        await this.processGroup(league, group.group_number, lastWeek, newWeek, leagues.rows);
      }
    }

    // Sync all users' current_league_tier
    await query(
      `UPDATE users u SET current_league_tier = l.tier
       FROM league_memberships lm
       JOIN leagues l ON l.id = lm.league_id
       WHERE lm.user_id = u.id AND lm.season_week = $1`,
      [newWeek]
    );

    // Clean up old caches
    await deleteCachePattern('leagues:*');

    logger.info('League promotions completed');
  }

  private static async processGroup(
    league: any,
    groupNumber: number,
    lastWeek: string,
    newWeek: string,
    allLeagues: any[]
  ): Promise<void> {
    // Get members ordered by weekly_xp (sync from users first)
    await pool.query(
      `UPDATE league_memberships lm
       SET weekly_xp = u.weekly_xp
       FROM users u
       WHERE lm.user_id = u.id AND lm.league_id = $1 AND lm.season_week = $2 AND lm.group_number = $3`,
      [league.id, lastWeek, groupNumber]
    );

    const members = await pool.query(
      `SELECT * FROM league_memberships
       WHERE league_id = $1 AND season_week = $2 AND group_number = $3
       ORDER BY weekly_xp DESC, created_at ASC`,
      [league.id, lastWeek, groupNumber]
    );

    if (members.rows.length === 0) return;

    const totalMembers = members.rows.length;
    const nextLeague = allLeagues.find((l: any) => l.tier === league.tier + 1);
    const prevLeague = allLeagues.find((l: any) => l.tier === league.tier - 1);

    for (let i = 0; i < totalMembers; i++) {
      const member = members.rows[i];
      const position = i + 1;
      let promoted = false;
      let demoted = false;
      let newLeagueId = league.id;

      // Top N get promoted (if not already in highest league)
      if (position <= league.promotion_slots && nextLeague) {
        promoted = true;
        newLeagueId = nextLeague.id;
      }

      // Bottom N get demoted (if not in lowest league)
      if (position > totalMembers - league.demotion_slots && prevLeague && league.demotion_slots > 0) {
        demoted = true;
        newLeagueId = prevLeague.id;
      }

      // Update position in current membership
      await pool.query(
        `UPDATE league_memberships SET position = $1, promoted = $2, demoted = $3
         WHERE id = $4`,
        [position, promoted, demoted, member.id]
      );

      // Archive to history
      await pool.query(
        `INSERT INTO league_history (user_id, league_id, season_week, final_position, final_xp, promoted, demoted)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, season_week) DO UPDATE SET
           final_position = EXCLUDED.final_position, final_xp = EXCLUDED.final_xp,
           promoted = EXCLUDED.promoted, demoted = EXCLUDED.demoted`,
        [member.user_id, league.id, lastWeek, position, member.weekly_xp, promoted, demoted]
      );

      // Create membership for new week in the appropriate league
      await pool.query(
        `INSERT INTO league_memberships (user_id, league_id, season_week, group_number, weekly_xp)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (user_id, season_week) DO NOTHING`,
        [member.user_id, newLeagueId, newWeek]
      );
    }

    // Re-assign groups for new week (group users that were just placed with group_number=0)
    await this.reassignGroups(newWeek);
  }

  /**
   * Re-assign group_number=0 memberships into proper groups of max 30
   */
  private static async reassignGroups(seasonWeek: string): Promise<void> {
    const unassigned = await pool.query(
      `SELECT lm.id, lm.league_id FROM league_memberships lm
       WHERE lm.season_week = $1 AND lm.group_number = 0
       ORDER BY lm.league_id, lm.created_at`,
      [seasonWeek]
    );

    if (unassigned.rows.length === 0) return;

    // Group by league_id
    const byLeague = new Map<string, string[]>();
    for (const row of unassigned.rows) {
      if (!byLeague.has(row.league_id)) byLeague.set(row.league_id, []);
      byLeague.get(row.league_id)!.push(row.id);
    }

    for (const [leagueId, membershipIds] of byLeague) {
      // Find current max group for this league/week
      const maxResult = await pool.query(
        `SELECT COALESCE(MAX(group_number), 0) as max_group
         FROM league_memberships
         WHERE league_id = $1 AND season_week = $2 AND group_number > 0`,
        [leagueId, seasonWeek]
      );

      // Find groups with space
      const groupsWithSpace = await pool.query(
        `SELECT group_number, COUNT(*) as cnt
         FROM league_memberships
         WHERE league_id = $1 AND season_week = $2 AND group_number > 0
         GROUP BY group_number
         HAVING COUNT(*) < 30
         ORDER BY group_number`,
        [leagueId, seasonWeek]
      );

      let currentGroup = maxResult.rows[0].max_group;
      let spaceIdx = 0;
      let remainingInGroup = 0;

      if (groupsWithSpace.rows.length > 0) {
        currentGroup = groupsWithSpace.rows[0].group_number;
        remainingInGroup = 30 - parseInt(groupsWithSpace.rows[0].cnt);
        spaceIdx = 1;
      } else {
        currentGroup = currentGroup + 1;
        remainingInGroup = 30;
      }

      for (const membershipId of membershipIds) {
        if (remainingInGroup <= 0) {
          if (spaceIdx < groupsWithSpace.rows.length) {
            currentGroup = groupsWithSpace.rows[spaceIdx].group_number;
            remainingInGroup = 30 - parseInt(groupsWithSpace.rows[spaceIdx].cnt);
            spaceIdx++;
          } else {
            currentGroup = maxResult.rows[0].max_group + 1;
            maxResult.rows[0].max_group = currentGroup;
            remainingInGroup = 30;
          }
        }

        await pool.query(
          'UPDATE league_memberships SET group_number = $1 WHERE id = $2',
          [currentGroup, membershipId]
        );
        remainingInGroup--;
      }
    }
  }
}

/**
 * Get ISO week string e.g. '2026-W06'
 * @param offset weeks offset (0 = current, -1 = last week)
 */
function getSeasonWeek(offset = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((now.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export { getSeasonWeek };
