import { Router } from 'express';
import { StudySessionsController } from './controllers/study-sessions.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import {
  createStudySessionSchema,
  updateStudySessionSchema,
} from './validators/study-sessions.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/stats', StudySessionsController.getStats);
router.post('/', validateRequest(createStudySessionSchema), StudySessionsController.create);
router.get('/', StudySessionsController.getAll);
router.get('/:id', StudySessionsController.getById);
router.put('/:id', validateRequest(updateStudySessionSchema), StudySessionsController.update);
router.delete('/:id', StudySessionsController.delete);

export default router;
