import { Request, Response } from 'express';
import { ChallengesService } from '../services/challenges.service';
import {
  createChallengeSchema,
  respondInvitationSchema,
} from '../validators/challenge.validator';
import { ResponseUtil } from '../../../shared/utils/response.util';
import { AppError } from '../../../shared/utils/AppError';

const service = new ChallengesService();

export class ChallengesController {
  /**
   * Create a new challenge
   */
  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const validatedData = createChallengeSchema.parse(req.body);
    const challenge = await service.create(userId, validatedData);

    ResponseUtil.success(res, challenge, 'Desafio criado com sucesso', 201);
  }

  /**
   * Get my challenges
   */
  async getMyChallenges(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const challenges = await service.getMyChallenges(userId);

    ResponseUtil.success(res, challenges, 'Desafios obtidos com sucesso');
  }

  /**
   * Get pending invitations
   */
  async getPendingInvitations(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const invitations = await service.getPendingInvitations(userId);

    ResponseUtil.success(res, invitations, 'Convites obtidos com sucesso');
  }

  /**
   * Get a challenge by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const challenge = await service.getById(userId, id);

    ResponseUtil.success(res, challenge, 'Desafio obtido com sucesso');
  }

  /**
   * Get challenge participants
   */
  async getParticipants(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const participants = await service.getParticipants(id);

    ResponseUtil.success(res, participants, 'Participantes obtidos com sucesso');
  }

  /**
   * Get challenge leaderboard
   */
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const leaderboard = await service.getChallengeLeaderboard(id);

    ResponseUtil.success(res, leaderboard, 'Leaderboard obtido com sucesso');
  }

  /**
   * Respond to invitation
   */
  async respondToInvitation(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { status } = respondInvitationSchema.parse(req.body);

    await service.respondToInvitation(userId, id, status);
    const message = status === 'accepted' ? 'Você entrou no desafio!' : 'Convite recusado';

    ResponseUtil.success(res, null, message);
  }

  /**
   * Start a challenge
   */
  async startChallenge(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const challenge = await service.startChallenge(userId, id);

    ResponseUtil.success(res, challenge, 'Desafio iniciado!');
  }

  /**
   * Cancel a challenge
   */
  async cancelChallenge(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    await service.cancelChallenge(userId, id);

    ResponseUtil.success(res, null, 'Desafio cancelado');
  }
}
