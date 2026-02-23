import { z } from 'zod';

export const createArticleSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    content: z.string().min(50).max(100000),
    excerpt: z.string().max(500).optional(),
    cover_image_url: z.string().url().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  }),
});

export const updateArticleSchema = z.object({
  params: z.object({
    articleId: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    content: z.string().min(50).max(100000).optional(),
    excerpt: z.string().max(500).optional(),
    cover_image_url: z.string().url().nullable().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  }),
});

export const articleIdParamSchema = z.object({
  params: z.object({
    articleId: z.string().uuid(),
  }),
});

export const articleSlugParamSchema = z.object({
  params: z.object({
    slug: z.string().min(1).max(250),
  }),
});

export const articleQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
    tag: z.string().max(50).optional(),
  }),
});

export const userArticlesParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
  }),
});
