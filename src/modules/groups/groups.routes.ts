import { Router } from 'express';
import { GroupsController } from './controllers/groups.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import {
  createGroupSchema,
  updateGroupSchema,
  groupIdParamSchema,
  groupMemberActionSchema,
  sendMessageSchema,
  groupListQuerySchema,
  groupMessagesQuerySchema,
} from './validators/groups.validator';

const router = Router();

router.use(authenticate);

// Group CRUD
router.post('/', validateRequest(createGroupSchema), asyncHandler(GroupsController.createGroup));
router.get('/', validateRequest(groupListQuerySchema), asyncHandler(GroupsController.listGroups));
router.get('/:groupId', validateRequest(groupIdParamSchema), asyncHandler(GroupsController.getGroup));
router.put('/:groupId', validateRequest(updateGroupSchema), asyncHandler(GroupsController.updateGroup));
router.delete('/:groupId', validateRequest(groupIdParamSchema), asyncHandler(GroupsController.deleteGroup));

// Membership
router.post('/:groupId/join', validateRequest(groupIdParamSchema), asyncHandler(GroupsController.joinGroup));
router.post('/:groupId/leave', validateRequest(groupIdParamSchema), asyncHandler(GroupsController.leaveGroup));
router.get('/:groupId/members', validateRequest(groupIdParamSchema), asyncHandler(GroupsController.getMembers));
router.delete('/:groupId/members/:userId', validateRequest(groupMemberActionSchema), asyncHandler(GroupsController.kickMember));

// Messages
router.post('/:groupId/messages', validateRequest(sendMessageSchema), asyncHandler(GroupsController.sendMessage));
router.get('/:groupId/messages', validateRequest(groupMessagesQuerySchema), asyncHandler(GroupsController.getMessages));

export default router;
