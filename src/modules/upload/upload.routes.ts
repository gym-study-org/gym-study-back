import { Router } from 'express';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { mediaUpload } from '../../config/storage';
import { UploadController } from './upload.controller';

const router = Router();

// POST /api/upload/media — upload a single image or video (max 50MB)
router.post(
  '/media',
  authenticate,
  mediaUpload.single('file'),
  asyncHandler(UploadController.uploadMedia)
);

export default router;
