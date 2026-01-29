import { Request, Response } from 'express';
import { GoalsService } from '../services/goals.service';
import { createGoalSchema, updateGoalSchema } from '../validators/goal.validator';
import { ResponseUtil } from '../../../shared/utils/response.util';
import { AppError } from '../../../shared/utils/AppError';
import { GoalStatus } from '../interfaces/goal.interface';

const service = new GoalsService();

export class GoalsController {
  /**
   * Create a new goal
   */
  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const validatedData = createGoalSchema.parse(req.body);
    const goal = await service.create(userId, validatedData);

    ResponseUtil.success(res, goal, 'Goal created successfully', 201);
  }

  /**
   * Get all goals with pagination
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as GoalStatus | undefined;

    const { goals, total } = await service.getAll(userId, page, limit, status);

    ResponseUtil.success(res, goals, 'Goals retrieved successfully', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }

  /**
   * Get a single goal by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const goal = await service.getById(userId, id);

    ResponseUtil.success(res, goal, 'Goal retrieved successfully');
  }

  /**
   * Update a goal
   */
  async update(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const validatedData = updateGoalSchema.parse(req.body);

    const goal = await service.update(userId, id, validatedData);

    ResponseUtil.success(res, goal, 'Goal updated successfully');
  }

  /**
   * Delete a goal
   */
  async delete(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    await service.delete(userId, id);

    ResponseUtil.success(res, null, 'Goal deleted successfully');
  }

  /**
   * Update progress of a goal
   */
  async updateProgress(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { increment } = req.body;

    if (typeof increment !== 'number') {
      throw new AppError('Increment must be a number', 400);
    }

    const goal = await service.updateProgress(userId, id, increment);

    ResponseUtil.success(res, goal, 'Goal progress updated successfully');
  }

  /**
   * Get goals statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const stats = await service.getStats(userId);

    ResponseUtil.success(res, stats, 'Statistics retrieved successfully');
  }
}
