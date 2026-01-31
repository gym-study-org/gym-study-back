import { pool } from '../../../config/database';
import {
  Certification,
  CreateCertificationInput,
  UpdateCertificationInput,
} from '../interfaces/certification.interface';
import { AppError } from '../../../shared/utils/AppError';
import { checkAndEmitAchievements } from '../../achievements/controllers/achievements.controller';
import { logger } from '../../../shared/utils/logger.util';

export class CertificationsService {
  /**
   * Create a new certification
   */
  async create(userId: string, data: CreateCertificationInput): Promise<Certification> {
    const query = `
      INSERT INTO certifications (
        user_id, name, provider, category, description,
        score, max_score, passed, obtained_at, expires_at,
        credential_id, credential_url, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      userId,
      data.name,
      data.provider || null,
      data.category || null,
      data.description || null,
      data.score || null,
      data.max_score || null,
      data.passed !== undefined ? data.passed : true,
      data.obtained_at,
      data.expires_at || null,
      data.credential_id || null,
      data.credential_url || null,
      data.tags || null,
    ];

    const result = await pool.query<Certification>(query, values);
    const certification = result.rows[0];

    // Check for certification achievements (async, don't block response)
    checkAndEmitAchievements(userId, 'certifications').catch((err) =>
      logger.error('Error checking certification achievements:', err)
    );

    return certification;
  }

  /**
   * Get all certifications for a user with pagination
   */
  async getAll(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ certifications: Certification[]; total: number }> {
    const offset = (page - 1) * limit;

    const countQuery = 'SELECT COUNT(*) FROM certifications WHERE user_id = $1';
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const query = `
      SELECT * FROM certifications
      WHERE user_id = $1
      ORDER BY obtained_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query<Certification>(query, [userId, limit, offset]);

    return {
      certifications: result.rows,
      total,
    };
  }

  /**
   * Get a single certification by ID
   */
  async getById(userId: string, certificationId: string): Promise<Certification> {
    const query = 'SELECT * FROM certifications WHERE id = $1 AND user_id = $2';
    const result = await pool.query<Certification>(query, [certificationId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Certification not found', 404);
    }

    return result.rows[0];
  }

  /**
   * Update a certification
   */
  async update(
    userId: string,
    certificationId: string,
    data: UpdateCertificationInput
  ): Promise<Certification> {
    // Check if certification exists and belongs to user
    await this.getById(userId, certificationId);

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.provider !== undefined) {
      fields.push(`provider = $${paramIndex++}`);
      values.push(data.provider);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.score !== undefined) {
      fields.push(`score = $${paramIndex++}`);
      values.push(data.score);
    }
    if (data.max_score !== undefined) {
      fields.push(`max_score = $${paramIndex++}`);
      values.push(data.max_score);
    }
    if (data.passed !== undefined) {
      fields.push(`passed = $${paramIndex++}`);
      values.push(data.passed);
    }
    if (data.obtained_at !== undefined) {
      fields.push(`obtained_at = $${paramIndex++}`);
      values.push(data.obtained_at);
    }
    if (data.expires_at !== undefined) {
      fields.push(`expires_at = $${paramIndex++}`);
      values.push(data.expires_at);
    }
    if (data.credential_id !== undefined) {
      fields.push(`credential_id = $${paramIndex++}`);
      values.push(data.credential_id);
    }
    if (data.credential_url !== undefined) {
      fields.push(`credential_url = $${paramIndex++}`);
      values.push(data.credential_url);
    }
    if (data.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(data.tags);
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(certificationId, userId);

    const query = `
      UPDATE certifications
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query<Certification>(query, values);
    return result.rows[0];
  }

  /**
   * Delete a certification
   */
  async delete(userId: string, certificationId: string): Promise<void> {
    const query = 'DELETE FROM certifications WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await pool.query(query, [certificationId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Certification not found', 404);
    }
  }

  /**
   * Get certifications by category
   */
  async getByCategory(userId: string, category: string): Promise<Certification[]> {
    const query = `
      SELECT * FROM certifications
      WHERE user_id = $1 AND category = $2
      ORDER BY obtained_at DESC
    `;
    const result = await pool.query<Certification>(query, [userId, category]);
    return result.rows;
  }

  /**
   * Get certifications statistics
   */
  async getStats(userId: string): Promise<{
    total_certifications: number;
    passed_count: number;
    failed_count: number;
    categories: { category: string; count: number }[];
    providers: { provider: string; count: number }[];
    recent_certifications: Certification[];
  }> {
    // Total and passed/failed counts
    const countQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN passed = true THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN passed = false THEN 1 ELSE 0 END) as failed
      FROM certifications
      WHERE user_id = $1
    `;
    const countResult = await pool.query(countQuery, [userId]);

    // Categories breakdown
    const categoriesQuery = `
      SELECT category, COUNT(*) as count
      FROM certifications
      WHERE user_id = $1 AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;
    const categoriesResult = await pool.query(categoriesQuery, [userId]);

    // Providers breakdown
    const providersQuery = `
      SELECT provider, COUNT(*) as count
      FROM certifications
      WHERE user_id = $1 AND provider IS NOT NULL
      GROUP BY provider
      ORDER BY count DESC
    `;
    const providersResult = await pool.query(providersQuery, [userId]);

    // Recent certifications
    const recentQuery = `
      SELECT * FROM certifications
      WHERE user_id = $1
      ORDER BY obtained_at DESC
      LIMIT 5
    `;
    const recentResult = await pool.query<Certification>(recentQuery, [userId]);

    return {
      total_certifications: parseInt(countResult.rows[0].total, 10),
      passed_count: parseInt(countResult.rows[0].passed || '0', 10),
      failed_count: parseInt(countResult.rows[0].failed || '0', 10),
      categories: categoriesResult.rows.map((row: any) => ({
        category: row.category,
        count: parseInt(row.count, 10),
      })),
      providers: providersResult.rows.map((row: any) => ({
        provider: row.provider,
        count: parseInt(row.count, 10),
      })),
      recent_certifications: recentResult.rows,
    };
  }
}
