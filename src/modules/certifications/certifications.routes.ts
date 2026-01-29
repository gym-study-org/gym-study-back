import { Router } from 'express';
import { CertificationsController } from './controllers/certifications.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();
const controller = new CertificationsController();

// All routes require authentication
router.use(authenticate);

// Statistics
router.get('/stats', asyncHandler(controller.getStats.bind(controller)));

// By category
router.get('/category/:category', asyncHandler(controller.getByCategory.bind(controller)));

// CRUD
router.post('/', asyncHandler(controller.create.bind(controller)));
router.get('/', asyncHandler(controller.getAll.bind(controller)));
router.get('/:id', asyncHandler(controller.getById.bind(controller)));
router.put('/:id', asyncHandler(controller.update.bind(controller)));
router.delete('/:id', asyncHandler(controller.delete.bind(controller)));

export default router;
