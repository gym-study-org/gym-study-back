import { z } from 'zod';

export const leagueHistoryQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional().default('20'),
    cursor: z.string().optional(),
  }),
});
