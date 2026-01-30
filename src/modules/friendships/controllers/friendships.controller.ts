import { Request, Response } from 'express';
import { FriendshipsService } from '../services/friendships.service';
import {
  sendFriendRequestSchema,
  respondFriendRequestSchema,
} from '../validators/friendship.validator';
import { ResponseUtil } from '../../../shared/utils/response.util';
import { AppError } from '../../../shared/utils/AppError';

const service = new FriendshipsService();

export class FriendshipsController {
  /**
   * Send a friend request
   */
  async sendRequest(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { addressee_id } = sendFriendRequestSchema.parse(req.body);
    const friendship = await service.sendRequest(userId, addressee_id);

    ResponseUtil.success(res, friendship, 'Pedido de amizade enviado', 201);
  }

  /**
   * Respond to a friend request
   */
  async respondToRequest(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { status } = respondFriendRequestSchema.parse(req.body);

    const friendship = await service.respondToRequest(userId, id, status);
    const message = status === 'accepted' ? 'Amizade aceita!' : 'Pedido rejeitado';

    ResponseUtil.success(res, friendship, message);
  }

  /**
   * Get all friends
   */
  async getFriends(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const friends = await service.getFriends(userId);

    ResponseUtil.success(res, friends, 'Amigos listados com sucesso');
  }

  /**
   * Get pending requests received
   */
  async getPendingRequests(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const requests = await service.getPendingRequests(userId);

    ResponseUtil.success(res, requests, 'Pedidos pendentes listados');
  }

  /**
   * Get sent requests
   */
  async getSentRequests(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const requests = await service.getSentRequests(userId);

    ResponseUtil.success(res, requests, 'Pedidos enviados listados');
  }

  /**
   * Remove a friend
   */
  async removeFriend(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { friendId } = req.params;
    await service.removeFriend(userId, friendId);

    ResponseUtil.success(res, null, 'Amizade removida');
  }

  /**
   * Cancel a sent request
   */
  async cancelRequest(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    await service.cancelRequest(userId, id);

    ResponseUtil.success(res, null, 'Pedido cancelado');
  }

  /**
   * Search users
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      throw new AppError('Parâmetro de busca é obrigatório', 400);
    }

    const users = await service.searchUsers(userId, q);

    ResponseUtil.success(res, users, 'Usuários encontrados');
  }
}
