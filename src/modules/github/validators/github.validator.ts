import { z } from 'zod';

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});
