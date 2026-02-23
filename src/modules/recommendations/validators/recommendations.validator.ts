import { z } from 'zod';

const relationshipTypes = ['study_partner', 'mentor', 'colleague'] as const;

export const createRecommendationSchema = z.object({
  body: z.object({
    recipient_id: z.string().uuid(),
    relationship: z.enum(relationshipTypes),
    content: z.string().min(10).max(2000),
  }),
});

export const updateRecommendationSchema = z.object({
  params: z.object({
    recommendationId: z.string().uuid(),
  }),
  body: z.object({
    content: z.string().min(10).max(2000).optional(),
    is_visible: z.boolean().optional(),
  }),
});

export const recommendationIdParamSchema = z.object({
  params: z.object({
    recommendationId: z.string().uuid(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});
