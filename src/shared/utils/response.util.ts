import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/common.types';

export class ResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200,
    pagination?: { page: number; limit: number; total: number; totalPages: number }
  ) {
    const response: any = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };

    if (pagination) {
      response.pagination = pagination;
    }

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    code: string,
    message: string,
    statusCode = 400,
    details?: any
  ) {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
  ) {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
  }
}
