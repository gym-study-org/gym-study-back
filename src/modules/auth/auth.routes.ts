import { Router } from 'express';
import { AuthController } from './controllers/auth.controller';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { registerSchema, loginSchema } from './validators/auth.validator';

const router = Router();

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

export default router;
