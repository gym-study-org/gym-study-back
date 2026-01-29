export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'BAD_REQUEST',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}
