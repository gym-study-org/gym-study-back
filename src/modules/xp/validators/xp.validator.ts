import { z } from 'zod';

export const xpHistoryQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional().default('20'),
    cursor: z.string().optional(),
    source: z.string().optional(),
  }),
});
