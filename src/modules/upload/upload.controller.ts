import path from 'path';
import { Request, Response } from 'express';
import { AppError } from '../../shared/utils/AppError';
import { ResponseUtil } from '../../shared/utils/response.util';
import { uploadMediaToStorage } from '../../config/storage';

const EXT_MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export class UploadController {
  static uploadMedia = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new AppError('Arquivo obrigatório', 400, 'NO_FILE');
    }

    const ext = path.extname(req.file.originalname || '').toLowerCase();

    // Browser may send "text/plain" for MediaRecorder blobs whose MIME type contains
    // unquoted codec params (e.g. "video/webm;codecs=vp9,opus"). Fall back to the
    // extension-based MIME so MinIO stores the file with the correct Content-Type.
    const storageMime =
      req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/')
        ? req.file.mimetype
        : (EXT_MIME_MAP[ext] ?? 'application/octet-stream');

    const url = await uploadMediaToStorage(req.file.buffer, storageMime, req.file.originalname);

    const type = storageMime.startsWith('video/') ? 'video' : 'image';

    ResponseUtil.success(res, { url, type, mimetype: storageMime }, undefined, 201);
  };
}
