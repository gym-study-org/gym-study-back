import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { ResponseUtil } from '../../../shared/utils/response.util';
import { getCacheOrFetch } from '../../../shared/utils/cache.util';

export class PublicController {
  /**
   * GET /api/public/profile/:username - Public profile with stats
   */
  static async getProfile(req: Request, res: Response) {
    const { username } = req.params;
    const cacheKey = `public:profile:${username}`;

    const profile = await getCacheOrFetch(cacheKey, async () => {
      const result = await pool.query(
        `SELECT
          u.id, u.username, u.full_name, u.avatar_url, u.bio,
          u.total_study_hours, u.current_streak, u.longest_streak,
          u.created_at,
          COALESCE(sc.total_sessions, 0) as total_sessions,
          COALESCE(cc.total_certifications, 0) as total_certifications,
          COALESCE(bc.badge_count, 0) as badge_count
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_sessions
          FROM study_sessions
          GROUP BY user_id
        ) sc ON sc.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_certifications
          FROM certifications WHERE passed = true
          GROUP BY user_id
        ) cc ON cc.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as badge_count
          FROM user_badges
          GROUP BY user_id
        ) bc ON bc.user_id = u.id
        WHERE u.username = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
        [username]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    }, 120);

    if (!profile) {
      return ResponseUtil.error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    return ResponseUtil.success(res, profile);
  }

  /**
   * GET /api/public/badges/:username - Hireable-signal badges for a user
   */
  static async getBadges(req: Request, res: Response) {
    const { username } = req.params;
    const cacheKey = `public:badges:${username}`;

    const data = await getCacheOrFetch(cacheKey, async () => {
      // Get user by username
      const userResult = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND is_active = true AND deleted_at IS NULL',
        [username]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      const userId = userResult.rows[0].id;

      // Get all badges with hireable signal
      const badges = await pool.query(
        `SELECT
          bd.code, bd.name, bd.description, bd.icon, bd.category,
          bd.is_hireable_signal, bd.verification_requirements,
          ub.current_level, ub.current_tier, ub.progress_percentage,
          ub.earned_at, ub.last_level_up_at
        FROM user_badges ub
        JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
        WHERE ub.user_id = $1 AND bd.is_hireable_signal = true
        ORDER BY ub.current_level DESC`,
        [userId]
      );

      // Enrich with verified skills data
      const skills = await pool.query(
        `SELECT
          vs.score, vs.level, vs.verification_type, vs.verified_at,
          sc.name as skill_name, sc.code as skill_code,
          vs.endorsement_count
        FROM verified_skills vs
        JOIN skill_categories sc ON sc.id = vs.skill_category_id
        WHERE vs.user_id = $1 AND vs.is_active = true`,
        [userId]
      );

      return {
        badges: badges.rows,
        verified_skills: skills.rows,
      };
    }, 300);

    if (!data) {
      return ResponseUtil.error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    return ResponseUtil.success(res, data);
  }

  /**
   * GET /api/public/verify/:username/:badgeCode - Verify a specific badge
   */
  static async verifyBadge(req: Request, res: Response) {
    const { username, badgeCode } = req.params;
    const cacheKey = `public:verify:${username}:${badgeCode}`;

    const verification = await getCacheOrFetch(cacheKey, async () => {
      const result = await pool.query(
        `SELECT
          u.username, u.full_name, u.avatar_url,
          bd.code, bd.name, bd.description, bd.is_hireable_signal,
          bd.verification_requirements,
          ub.current_level, ub.current_tier, ub.earned_at, ub.last_level_up_at
        FROM user_badges ub
        JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
        JOIN users u ON u.id = ub.user_id
        WHERE u.username = $1 AND bd.code = $2
          AND u.is_active = true AND u.deleted_at IS NULL`,
        [username, badgeCode]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const badge = result.rows[0];

      // Get assessment evidence if skill badge
      let evidence = null;
      if (badgeCode.startsWith('skill_')) {
        const skillCode = badgeCode.replace('skill_', '');
        const evidenceResult = await pool.query(
          `SELECT
            vs.score, vs.level, vs.verified_at, vs.endorsement_count,
            u.total_study_hours
          FROM verified_skills vs
          JOIN skill_categories sc ON sc.id = vs.skill_category_id
          JOIN users u ON u.id = vs.user_id
          WHERE u.username = $1 AND sc.code = $2 AND vs.is_active = true`,
          [username, skillCode]
        );
        evidence = evidenceResult.rows[0] || null;
      }

      return {
        verified: true,
        badge,
        evidence,
        verified_at: new Date().toISOString(),
      };
    }, 600);

    if (!verification) {
      return ResponseUtil.success(res, { verified: false, message: 'Badge not found for this user' });
    }

    return ResponseUtil.success(res, verification);
  }

  /**
   * GET /api/public/embed/:username - SVG/HTML embed data for portfolio
   */
  static async getEmbed(req: Request, res: Response) {
    const { username } = req.params;
    const cacheKey = `public:embed:${username}`;

    const data = await getCacheOrFetch(cacheKey, async () => {
      const result = await pool.query(
        `SELECT
          u.username, u.full_name, u.avatar_url,
          u.total_study_hours, u.current_streak, u.longest_streak,
          COALESCE(bc.badge_count, 0) as badge_count,
          COALESCE(hc.hireable_count, 0) as hireable_badge_count
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as badge_count FROM user_badges GROUP BY user_id
        ) bc ON bc.user_id = u.id
        LEFT JOIN (
          SELECT ub.user_id, COUNT(*) as hireable_count
          FROM user_badges ub
          JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
          WHERE bd.is_hireable_signal = true
          GROUP BY ub.user_id
        ) hc ON hc.user_id = u.id
        WHERE u.username = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
        [username]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];

      // Get top hireable badges
      const topBadges = await pool.query(
        `SELECT bd.code, bd.name, bd.icon, ub.current_tier
        FROM user_badges ub
        JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
        JOIN users u ON u.id = ub.user_id
        WHERE u.username = $1 AND bd.is_hireable_signal = true
        ORDER BY ub.current_level DESC
        LIMIT 5`,
        [username]
      );

      return {
        user,
        top_badges: topBadges.rows,
        profile_url: `/profile/${username}`,
      };
    }, 300);

    if (!data) {
      return ResponseUtil.error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    return ResponseUtil.success(res, data);
  }
}
