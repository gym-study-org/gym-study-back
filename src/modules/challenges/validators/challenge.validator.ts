import { z } from 'zod';

export const createChallengeSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional(),
  challenge_type: z.enum(['hours', 'sessions', 'streak', 'certifications'], {
    errorMap: () => ({ message: 'Tipo de desafio inválido' }),
  }),
  target_value: z.number().positive('Meta deve ser positiva'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de fim é obrigatória'),
  invited_friends: z.array(z.string().uuid()).min(1, 'Convide pelo menos um amigo'),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['end_date'],
  }
);

export const updateChallengeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  target_value: z.number().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const respondInvitationSchema = z.object({
  status: z.enum(['accepted', 'rejected'], {
    errorMap: () => ({ message: 'Status deve ser accepted ou rejected' }),
  }),
});

export type CreateChallengeDTO = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeDTO = z.infer<typeof updateChallengeSchema>;
export type RespondInvitationDTO = z.infer<typeof respondInvitationSchema>;
