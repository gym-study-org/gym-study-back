import { Request, Response, NextFunction } from 'express';
import { GroupsService } from '../services/groups.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class GroupsController {
  static async createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const group = await GroupsService.createGroup(userId, req.body);
      ResponseUtil.success(res, group, 'Grupo criado com sucesso', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const group = await GroupsService.getGroup(groupId, userId);
      ResponseUtil.success(res, group);
    } catch (error) {
      next(error);
    }
  }

  static async listGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { filter = 'all', limit = 20, cursor } = req.query;

      const groups = await GroupsService.listGroups(
        userId,
        filter as 'my' | 'public' | 'all',
        Number(limit),
        cursor as string | undefined
      );

      ResponseUtil.success(res, {
        groups,
        next_cursor: groups.length > 0 ? groups[groups.length - 1].created_at : null,
        has_more: groups.length === Number(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const group = await GroupsService.updateGroup(groupId, userId, req.body);
      ResponseUtil.success(res, group, 'Grupo atualizado');
    } catch (error) {
      next(error);
    }
  }

  static async deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      await GroupsService.deleteGroup(groupId, userId);
      ResponseUtil.success(res, null, 'Grupo excluído');
    } catch (error) {
      next(error);
    }
  }

  static async joinGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      await GroupsService.joinGroup(groupId, userId);
      ResponseUtil.success(res, null, 'Você entrou no grupo');
    } catch (error) {
      next(error);
    }
  }

  static async leaveGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      await GroupsService.leaveGroup(groupId, userId);
      ResponseUtil.success(res, null, 'Você saiu do grupo');
    } catch (error) {
      next(error);
    }
  }

  static async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const members = await GroupsService.getMembers(groupId);
      ResponseUtil.success(res, members);
    } catch (error) {
      next(error);
    }
  }

  static async kickMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user!.id;
      const { groupId, userId } = req.params;
      await GroupsService.kickMember(groupId, actorId, userId);
      ResponseUtil.success(res, null, 'Membro removido');
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const message = await GroupsService.sendMessage(groupId, userId, req.body);
      ResponseUtil.success(res, message, undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const { limit = 30, cursor } = req.query;

      const messages = await GroupsService.getMessages(
        groupId,
        userId,
        Number(limit),
        cursor as string | undefined
      );

      ResponseUtil.success(res, {
        messages,
        next_cursor: messages.length > 0 ? messages[messages.length - 1].created_at : null,
        has_more: messages.length === Number(limit),
      });
    } catch (error) {
      next(error);
    }
  }
}
