import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
  addressee_id: z.string().uuid('ID do usuário inválido'),
});

export const respondFriendRequestSchema = z.object({
  status: z.enum(['accepted', 'rejected'], {
    errorMap: () => ({ message: 'Status deve ser accepted ou rejected' }),
  }),
});

export type SendFriendRequestDTO = z.infer<typeof sendFriendRequestSchema>;
export type RespondFriendRequestDTO = z.infer<typeof respondFriendRequestSchema>;
