import { z } from 'zod';

export const createStudySessionSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(255),
    subject: z.string().min(2, 'Subject must be at least 2 characters').max(255),
    description: z.string().optional(),
    duration_minutes: z.number().int().positive('Duration must be positive'),
    is_for_certification: z.boolean().optional(),
    certification_name: z.string().max(255).optional(),
    tags: z.array(z.string()).optional(),
    started_at: z.string().datetime('Invalid datetime format'),
    finished_at: z.string().datetime('Invalid datetime format'),
  }),
});

export const updateStudySessionSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(255).optional(),
    subject: z.string().min(2).max(255).optional(),
    description: z.string().optional(),
    is_for_certification: z.boolean().optional(),
    certification_name: z.string().max(255).optional(),
    tags: z.array(z.string()).optional(),
  }),
});
