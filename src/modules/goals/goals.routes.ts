import { Router } from 'express';
import { GoalsController } from './controllers/goals.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();
const controller = new GoalsController();

// All routes require authentication
router.use(authenticate);

// Statistics
router.get('/stats', asyncHandler(controller.getStats.bind(controller)));

// Update progress
router.patch('/:id/progress', asyncHandler(controller.updateProgress.bind(controller)));

// CRUD
router.post('/', asyncHandler(controller.create.bind(controller)));
router.get('/', asyncHandler(controller.getAll.bind(controller)));
router.get('/:id', asyncHandler(controller.getById.bind(controller)));
router.put('/:id', asyncHandler(controller.update.bind(controller)));
router.delete('/:id', asyncHandler(controller.delete.bind(controller)));

export default router;
