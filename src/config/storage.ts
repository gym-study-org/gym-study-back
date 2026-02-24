import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from './environment';
import { logger } from '../shared/utils/logger.util';

export const s3Client = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // required for MinIO
});

export function getAvatarPublicUrl(key: string): string {
  return `${env.MINIO_PUBLIC_URL}/${env.MINIO_BUCKET}/${key}`;
}

/**
 * Upload buffer to MinIO and return public URL.
 */
export async function uploadToStorage(
  buffer: Buffer,
  mimetype: string,
  originalname: string
): Promise<string> {
  const ext = path.extname(originalname).toLowerCase() || '.jpg';
  const key = `avatars/${uuidv4()}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  return getAvatarPublicUrl(key);
}

/**
 * Multer middleware — stores file in memory for manual upload.
 */
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Use JPEG, PNG ou WebP.'));
    }
  },
});

/**
 * Multer middleware for generic media (images + videos, 50MB).
 */
export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    // Use startsWith to handle codec suffixes like "video/webm;codecs=vp9,opus"
    const allowedPrefixes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
    ];
    // Also allow generic types — browser may downgrade "video/webm;codecs=vp9,opus"
    // to "text/plain" or "application/octet-stream" due to unquoted codec params.
    const allowed =
      allowedPrefixes.some(prefix => file.mimetype.startsWith(prefix)) ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/octet-stream';
    if (allowed) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Use JPEG, PNG, WebP, GIF, MP4, WebM ou MOV.'));
    }
  },
});

/**
 * Upload generic media to MinIO under path media/{uuid}{ext}.
 */
export async function uploadMediaToStorage(
  buffer: Buffer,
  mimetype: string,
  originalname: string
): Promise<string> {
  const ext = path.extname(originalname).toLowerCase() || '.bin';
  const key = `media/${uuidv4()}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  return getAvatarPublicUrl(key);
}

/**
 * Ensure MinIO bucket exists and is publicly readable.
 * Called once on server startup.
 */
export async function initStorage(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
    logger.info(`MinIO: bucket "${env.MINIO_BUCKET}" already exists`);
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: env.MINIO_BUCKET }));
    logger.info(`MinIO: bucket "${env.MINIO_BUCKET}" created`);
  }

  // Make bucket publicly readable (avatars are public)
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${env.MINIO_BUCKET}/*`],
      },
    ],
  });

  await s3Client.send(
    new PutBucketPolicyCommand({ Bucket: env.MINIO_BUCKET, Policy: policy })
  );
  logger.info(`MinIO: bucket "${env.MINIO_BUCKET}" set to public read`);
}
