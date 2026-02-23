import { z } from 'zod';

const contentTypes = ['text', 'image', 'study_update', 'achievement'] as const;

export const createStorySchema = z.object({
  body: z.object({
    content_type: z.enum(contentTypes).optional().default('text'),
    content: z.string().max(500).optional(),
    media_url: z.string().url().optional(),
    metadata: z.record(z.unknown()).optional(),
    background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
});

export const storyIdParamSchema = z.object({
  params: z.object({
    storyId: z.string().uuid(),
  }),
});
