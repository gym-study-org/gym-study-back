import { pool } from '../../../config/database';
import { Goal, CreateGoalInput, UpdateGoalInput, GoalStatus } from '../interfaces/goal.interface';
import { AppError } from '../../../shared/utils/AppError';

export class GoalsService {
  /**
   * Create a new goal
   */
  async create(userId: string, data: CreateGoalInput): Promise<Goal> {
    const query = `
      INSERT INTO goals (
        user_id, title, description, category,
        target_type, target_value, current_value,
        start_date, end_date, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      userId,
      data.title,
      data.description || null,
      data.category || null,
      data.target_type,
      data.target_value,
      data.current_value || 0,
      data.start_date,
      data.end_date || null,
      data.tags || null,
    ];

    const result = await pool.query<Goal>(query, values);
    return result.rows[0];
  }

  /**
   * Get all goals for a user with pagination
   */
  async getAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: GoalStatus
  ): Promise<{ goals: Goal[]; total: number }> {
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) FROM goals WHERE user_id = $1';
    let query = `
      SELECT * FROM goals
      WHERE user_id = $1
    `;

    const countParams: any[] = [userId];
    const queryParams: any[] = [userId];

    if (status) {
      countQuery += ' AND status = $2';
      query += ' AND status = $2';
      countParams.push(status);
      queryParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    query += ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);

    const result = await pool.query<Goal>(query, queryParams);

    return {
      goals: result.rows,
      total,
    };
  }

  /**
   * Get a single goal by ID
   */
  async getById(userId: string, goalId: string): Promise<Goal> {
    const query = 'SELECT * FROM goals WHERE id = $1 AND user_id = $2';
    const result = await pool.query<Goal>(query, [goalId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Goal not found', 404);
    }

    return result.rows[0];
  }

  /**
   * Update a goal
   */
  async update(userId: string, goalId: string, data: UpdateGoalInput): Promise<Goal> {
    // Check if goal exists and belongs to user
    await this.getById(userId, goalId);

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.target_type !== undefined) {
      fields.push(`target_type = $${paramIndex++}`);
      values.push(data.target_type);
    }
    if (data.target_value !== undefined) {
      fields.push(`target_value = $${paramIndex++}`);
      values.push(data.target_value);
    }
    if (data.current_value !== undefined) {
      fields.push(`current_value = $${paramIndex++}`);
      values.push(data.current_value);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.start_date !== undefined) {
      fields.push(`start_date = $${paramIndex++}`);
      values.push(data.start_date);
    }
    if (data.end_date !== undefined) {
      fields.push(`end_date = $${paramIndex++}`);
      values.push(data.end_date);
    }
    if (data.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(data.tags);
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(goalId, userId);

    const query = `
      UPDATE goals
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query<Goal>(query, values);
    return result.rows[0];
  }

  /**
   * Delete a goal
   */
  async delete(userId: string, goalId: string): Promise<void> {
    const query = 'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await pool.query(query, [goalId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Goal not found', 404);
    }
  }

  /**
   * Update progress of a goal
   */
  async updateProgress(userId: string, goalId: string, increment: number): Promise<Goal> {
    const goal = await this.getById(userId, goalId);

    if (goal.status !== 'active') {
      throw new AppError('Cannot update progress of inactive goal', 400);
    }

    const newCurrentValue = goal.current_value + increment;
    const newStatus = newCurrentValue >= goal.target_value ? 'completed' : 'active';

    const query = `
      UPDATE goals
      SET current_value = $1, status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;

    const result = await pool.query<Goal>(query, [newCurrentValue, newStatus, goalId, userId]);
    return result.rows[0];
  }

  /**
   * Get goals statistics
   */
  async getStats(userId: string): Promise<{
    total_goals: number;
    active_goals: number;
    completed_goals: number;
    abandoned_goals: number;
    completion_rate: number;
    goals_by_type: { target_type: string; count: number }[];
    goals_by_category: { category: string; count: number }[];
    recent_goals: Goal[];
  }> {
    // Total and status counts
    const countQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned
      FROM goals
      WHERE user_id = $1
    `;
    const countResult = await pool.query(countQuery, [userId]);

    // Goals by type
    const typeQuery = `
      SELECT target_type, COUNT(*) as count
      FROM goals
      WHERE user_id = $1
      GROUP BY target_type
      ORDER BY count DESC
    `;
    const typeResult = await pool.query(typeQuery, [userId]);

    // Goals by category
    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM goals
      WHERE user_id = $1 AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;
    const categoryResult = await pool.query(categoryQuery, [userId]);

    // Recent goals
    const recentQuery = `
      SELECT * FROM goals
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const recentResult = await pool.query<Goal>(recentQuery, [userId]);

    const total = parseInt(countResult.rows[0].total, 10);
    const completed = parseInt(countResult.rows[0].completed || '0', 10);
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total_goals: total,
      active_goals: parseInt(countResult.rows[0].active || '0', 10),
      completed_goals: completed,
      abandoned_goals: parseInt(countResult.rows[0].abandoned || '0', 10),
      completion_rate: parseFloat(completionRate.toFixed(2)),
      goals_by_type: typeResult.rows.map((row: any) => ({
        target_type: row.target_type,
        count: parseInt(row.count, 10),
      })),
      goals_by_category: categoryResult.rows.map((row: any) => ({
        category: row.category,
        count: parseInt(row.count, 10),
      })),
      recent_goals: recentResult.rows,
    };
  }
}
