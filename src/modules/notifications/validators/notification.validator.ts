import { z } from 'zod';

export const notificationQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
    unread_only: z.coerce.boolean().optional().default(false),
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
