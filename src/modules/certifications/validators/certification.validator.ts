import { z } from 'zod';

export const createCertificationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  provider: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
  description: z.string().optional(),
  score: z.number().min(0).optional(),
  max_score: z.number().positive().optional(),
  passed: z.boolean().optional().default(true),
  obtained_at: z.string().datetime({ message: 'Data de obtenção inválida' }),
  expires_at: z.string().datetime({ message: 'Data de expiração inválida' }).optional(),
  credential_id: z.string().max(255).optional(),
  credential_url: z.string().url({ message: 'URL inválida' }).optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.score !== undefined && data.max_score !== undefined) {
      return data.score <= data.max_score;
    }
    return true;
  },
  {
    message: 'Score não pode ser maior que max_score',
    path: ['score'],
  }
);

export const updateCertificationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  provider: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
  description: z.string().optional(),
  score: z.number().min(0).optional(),
  max_score: z.number().positive().optional(),
  passed: z.boolean().optional(),
  obtained_at: z.string().datetime({ message: 'Data de obtenção inválida' }).optional(),
  expires_at: z.string().datetime({ message: 'Data de expiração inválida' }).optional(),
  credential_id: z.string().max(255).optional(),
  credential_url: z.string().url({ message: 'URL inválida' }).optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.score !== undefined && data.max_score !== undefined) {
      return data.score <= data.max_score;
    }
    return true;
  },
  {
    message: 'Score não pode ser maior que max_score',
    path: ['score'],
  }
);

export type CreateCertificationDTO = z.infer<typeof createCertificationSchema>;
export type UpdateCertificationDTO = z.infer<typeof updateCertificationSchema>;
