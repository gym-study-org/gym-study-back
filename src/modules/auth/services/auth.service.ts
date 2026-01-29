import bcrypt from 'bcryptjs';
import { query } from '../../../config/database';
import { AppError } from '../../../shared/middlewares/error-handler.middleware';
import { RegisterDTO, LoginDTO, AuthResponse } from '../interfaces/auth.interface';
import { JWTService } from './jwt.service';

export class AuthService {
  static async register(data: RegisterDTO): Promise<AuthResponse> {
    const { email, username, password, full_name } = data;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError(400, 'USER_EXISTS', 'Email or username already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO users (email, username, password_hash, full_name, auth_provider)
       VALUES ($1, $2, $3, $4, 'local')
       RETURNING id, email, username, full_name, avatar_url`,
      [email, username, password_hash, full_name || null]
    );

    const user = result.rows[0];

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    const token = JWTService.generateAccessToken(tokenPayload);
    const refreshToken = JWTService.generateRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
      token,
      refreshToken,
    };
  }

  static async login(data: LoginDTO): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user
    const result = await query(
      `SELECT id, email, username, password_hash, full_name, avatar_url, is_active
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled');
    }

    // Check if user has password (not OAuth user)
    if (!user.password_hash) {
      throw new AppError(
        400,
        'OAUTH_ACCOUNT',
        'This account uses OAuth. Please login with Google or GitHub'
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    const token = JWTService.generateAccessToken(tokenPayload);
    const refreshToken = JWTService.generateRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
      token,
      refreshToken,
    };
  }

  static async refreshToken(refreshToken: string): Promise<{ token: string }> {
    try {
      const payload = JWTService.verifyToken(refreshToken);

      // Verify user still exists and is active
      const result = await query(
        'SELECT id, email, username FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
        [payload.id]
      );

      if (result.rows.length === 0) {
        throw new AppError(401, 'INVALID_TOKEN', 'User not found or inactive');
      }

      const user = result.rows[0];
      const newToken = JWTService.generateAccessToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      return { token: newToken };
    } catch (error) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
    }
  }
}
