import { z } from 'zod';

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  target_type: z.enum(['hours', 'sessions', 'certifications', 'custom'], {
    errorMap: () => ({ message: 'Tipo de meta inválido' }),
  }),
  target_value: z.number().positive('Valor da meta deve ser positivo'),
  current_value: z.number().min(0, 'Valor atual deve ser >= 0').optional().default(0),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  },
  {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['end_date'],
  }
);

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  target_type: z.enum(['hours', 'sessions', 'certifications', 'custom']).optional(),
  target_value: z.number().positive().optional(),
  current_value: z.number().min(0).optional(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  },
  {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['end_date'],
  }
);

export type CreateGoalDTO = z.infer<typeof createGoalSchema>;
export type UpdateGoalDTO = z.infer<typeof updateGoalSchema>;
