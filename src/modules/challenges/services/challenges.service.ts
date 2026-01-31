import { pool } from '../../../config/database';
import {
  Challenge,
  ChallengeWithDetails,
  ParticipantWithUser,
  CreateChallengeInput,
} from '../interfaces/challenge.interface';
import { AppError } from '../../../shared/utils/AppError';

export class ChallengesService {
  /**
   * Create a new challenge
   */
  async create(creatorId: string, data: CreateChallengeInput): Promise<Challenge> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create challenge
      const challengeQuery = `
        INSERT INTO challenges (
          creator_id, title, description, challenge_type,
          target_value, status, start_date, end_date
        )
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        RETURNING *
      `;

      const challengeResult = await client.query<Challenge>(challengeQuery, [
        creatorId,
        data.title,
        data.description || null,
        data.challenge_type,
        data.target_value,
        data.start_date,
        data.end_date,
      ]);

      const challenge = challengeResult.rows[0];

      // Add creator as participant (auto-accepted)
      await client.query(
        `INSERT INTO challenge_participants (challenge_id, user_id, invitation_status, joined_at)
         VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP)`,
        [challenge.id, creatorId]
      );

      // Invite friends
      for (const friendId of data.invited_friends) {
        await client.query(
          `INSERT INTO challenge_participants (challenge_id, user_id, invitation_status)
           VALUES ($1, $2, 'pending')`,
          [challenge.id, friendId]
        );
      }

      await client.query('COMMIT');
      return challenge;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get challenges for a user (created or participating)
   */
  async getMyChallenges(userId: string): Promise<ChallengeWithDetails[]> {
    const query = `
      SELECT
        c.*,
        u.username as creator_name,
        u.avatar_url as creator_avatar_url,
        (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id AND invitation_status = 'accepted') as participants_count,
        COALESCE(cp.current_value, 0) as my_progress,
        cp.invitation_status as my_status
      FROM challenges c
      JOIN users u ON u.id = c.creator_id
      JOIN challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = $1
      ORDER BY
        CASE WHEN c.status = 'active' THEN 0 WHEN c.status = 'pending' THEN 1 ELSE 2 END,
        c.created_at DESC
    `;

    const result = await pool.query<ChallengeWithDetails>(query, [userId]);
    return result.rows;
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId: string): Promise<ChallengeWithDetails[]> {
    const query = `
      SELECT
        c.*,
        u.username as creator_name,
        u.avatar_url as creator_avatar_url,
        (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id AND invitation_status = 'accepted') as participants_count,
        0 as my_progress,
        cp.invitation_status as my_status
      FROM challenges c
      JOIN users u ON u.id = c.creator_id
      JOIN challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = $1
      WHERE cp.invitation_status = 'pending'
        AND c.status IN ('pending', 'active')
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query<ChallengeWithDetails>(query, [userId]);
    return result.rows;
  }

  /**
   * Get a single challenge by ID
   */
  async getById(userId: string, challengeId: string): Promise<ChallengeWithDetails> {
    const query = `
      SELECT
        c.*,
        u.username as creator_name,
        u.avatar_url as creator_avatar_url,
        (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id AND invitation_status = 'accepted') as participants_count,
        COALESCE(cp.current_value, 0) as my_progress,
        cp.invitation_status as my_status
      FROM challenges c
      JOIN users u ON u.id = c.creator_id
      LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = $2
      WHERE c.id = $1
    `;

    const result = await pool.query<ChallengeWithDetails>(query, [challengeId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Desafio não encontrado', 404);
    }

    return result.rows[0];
  }

  /**
   * Get participants of a challenge
   */
  async getParticipants(challengeId: string): Promise<ParticipantWithUser[]> {
    const query = `
      SELECT
        cp.*,
        u.username as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar_url
      FROM challenge_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.challenge_id = $1
        AND cp.invitation_status = 'accepted'
      ORDER BY cp.current_value DESC, cp.joined_at ASC
    `;

    const result = await pool.query<ParticipantWithUser>(query, [challengeId]);
    return result.rows;
  }

  /**
   * Respond to challenge invitation
   */
  async respondToInvitation(
    userId: string,
    challengeId: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    const query = `
      UPDATE challenge_participants
      SET invitation_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE challenge_id = $2 AND user_id = $3 AND invitation_status = 'pending'
      RETURNING id
    `;

    const result = await pool.query(query, [status, challengeId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Convite não encontrado ou já respondido', 404);
    }
  }

  /**
   * Start a challenge (change status to active)
   */
  async startChallenge(userId: string, challengeId: string): Promise<Challenge> {
    // Verify ownership
    const challenge = await this.getById(userId, challengeId);

    if (challenge.creator_id !== userId) {
      throw new AppError('Apenas o criador pode iniciar o desafio', 403);
    }

    if (challenge.status !== 'pending') {
      throw new AppError('Este desafio não pode ser iniciado', 400);
    }

    const query = `
      UPDATE challenges
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query<Challenge>(query, [challengeId]);
    return result.rows[0];
  }

  /**
   * Cancel a challenge
   */
  async cancelChallenge(userId: string, challengeId: string): Promise<void> {
    const challenge = await this.getById(userId, challengeId);

    if (challenge.creator_id !== userId) {
      throw new AppError('Apenas o criador pode cancelar o desafio', 403);
    }

    if (challenge.status === 'completed') {
      throw new AppError('Desafio já finalizado não pode ser cancelado', 400);
    }

    await pool.query(
      `UPDATE challenges SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [challengeId]
    );
  }

  /**
   * Update participant progress (called when user completes a study session)
   */
  async updateProgress(
    userId: string,
    challengeType: string,
    incrementValue: number
  ): Promise<void> {
    const query = `
      UPDATE challenge_participants cp
      SET current_value = current_value + $3, updated_at = CURRENT_TIMESTAMP
      FROM challenges c
      WHERE cp.challenge_id = c.id
        AND cp.user_id = $1
        AND cp.invitation_status = 'accepted'
        AND c.challenge_type = $2
        AND c.status = 'active'
        AND CURRENT_TIMESTAMP BETWEEN c.start_date AND c.end_date
    `;

    await pool.query(query, [userId, challengeType, incrementValue]);
  }

  /**
   * Check and complete challenges that have ended
   */
  async checkAndCompleteChallenge(challengeId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get challenge
      const challengeResult = await client.query<Challenge>(
        'SELECT * FROM challenges WHERE id = $1 AND status = \'active\'',
        [challengeId]
      );

      if (challengeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const challenge = challengeResult.rows[0];

      // Check if ended
      if (new Date(challenge.end_date) > new Date()) {
        await client.query('ROLLBACK');
        return;
      }

      // Get winner (participant with highest current_value)
      const winnerResult = await client.query(
        `SELECT user_id FROM challenge_participants
         WHERE challenge_id = $1 AND invitation_status = 'accepted'
         ORDER BY current_value DESC LIMIT 1`,
        [challengeId]
      );

      const winnerId = winnerResult.rows[0]?.user_id || null;

      // Update challenge
      await client.query(
        `UPDATE challenges SET status = 'completed', winner_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [winnerId, challengeId]
      );

      // Update positions
      await client.query(
        `UPDATE challenge_participants cp
         SET position = subq.rank
         FROM (
           SELECT id, RANK() OVER (ORDER BY current_value DESC) as rank
           FROM challenge_participants WHERE challenge_id = $1
         ) subq
         WHERE cp.id = subq.id`,
        [challengeId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get leaderboard for a specific challenge
   */
  async getChallengeLeaderboard(challengeId: string): Promise<ParticipantWithUser[]> {
    const query = `
      SELECT
        cp.*,
        u.username as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar_url,
        RANK() OVER (ORDER BY cp.current_value DESC) as position
      FROM challenge_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.challenge_id = $1
        AND cp.invitation_status = 'accepted'
      ORDER BY cp.current_value DESC
    `;

    const result = await pool.query<ParticipantWithUser>(query, [challengeId]);
    return result.rows;
  }
}
