import { Request, Response } from 'express';
import { CertificationsService } from '../services/certifications.service';
import {
  createCertificationSchema,
  updateCertificationSchema,
} from '../validators/certification.validator';
import { ResponseUtil } from '../../../shared/utils/response.util';
import { AppError } from '../../../shared/utils/AppError';

const service = new CertificationsService();

export class CertificationsController {
  /**
   * Create a new certification
   */
  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const validatedData = createCertificationSchema.parse(req.body);
    const certification = await service.create(userId, validatedData);

    ResponseUtil.success(res, certification, 'Certification created successfully', 201);
  }

  /**
   * Get all certifications with pagination
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { certifications, total } = await service.getAll(userId, page, limit);

    ResponseUtil.success(res, certifications, 'Certifications retrieved successfully', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }

  /**
   * Get a single certification by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const certification = await service.getById(userId, id);

    ResponseUtil.success(res, certification, 'Certification retrieved successfully');
  }

  /**
   * Update a certification
   */
  async update(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const validatedData = updateCertificationSchema.parse(req.body);

    const certification = await service.update(userId, id, validatedData);

    ResponseUtil.success(res, certification, 'Certification updated successfully');
  }

  /**
   * Delete a certification
   */
  async delete(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    await service.delete(userId, id);

    ResponseUtil.success(res, null, 'Certification deleted successfully');
  }

  /**
   * Get certifications statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const stats = await service.getStats(userId);

    ResponseUtil.success(res, stats, 'Statistics retrieved successfully');
  }

  /**
   * Get certifications by category
   */
  async getByCategory(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { category } = req.params;
    const certifications = await service.getByCategory(userId, category);

    ResponseUtil.success(res, certifications, 'Certifications retrieved successfully');
  }
}
