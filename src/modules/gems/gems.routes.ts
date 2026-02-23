import { Router } from 'express';
import { GemsController } from './controllers/gems.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();

router.use(authenticate);

// GET /gems/balance - Get gems balance summary
router.get('/balance', asyncHandler(GemsController.getBalance));

// GET /gems/history - Get gem transaction history
router.get('/history', asyncHandler(GemsController.getHistory));

// GET /gems/shop - Get shop items
router.get('/shop', asyncHandler(GemsController.getShop));

// POST /gems/shop/:itemCode/purchase - Purchase a shop item
router.post('/shop/:itemCode/purchase', asyncHandler(GemsController.purchaseItem));

export default router;
