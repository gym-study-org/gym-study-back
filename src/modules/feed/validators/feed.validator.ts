import { z } from 'zod';

const postTypes = [
  'text',
  'study_output',
  'certification_share',
  'achievement_share',
  'challenge_complete',
  'milestone',
  'code_snippet',
  'poll',
  'shared_post',
] as const;

const visibilities = ['public', 'friends', 'private'] as const;
const audiences = ['global', 'personal'] as const;

export const createPostSchema = z.object({
  body: z.object({
    content: z.string().min(0).max(5000),
    post_type: z.enum(postTypes).optional().default('text'),
    media_urls: z.array(z.string().url()).max(10).optional(),
    study_session_id: z.string().uuid().optional(),
    certification_id: z.string().uuid().optional(),
    metadata: z.record(z.unknown()).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    visibility: z.enum(visibilities).optional().default('public'),
    audience: z.enum(audiences).optional().default('global'),
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000).optional(),
    media_urls: z.array(z.string().url()).max(10).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    visibility: z.enum(visibilities).optional(),
  }),
  params: z.object({
    postId: z.string().uuid(),
  }),
});

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(2000),
    parent_id: z.string().uuid().optional(),
  }),
  params: z.object({
    postId: z.string().uuid(),
  }),
});

export const feedQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
    filter: z.enum(postTypes).optional(),
  }),
});

export const postIdParamSchema = z.object({
  params: z.object({
    postId: z.string().uuid(),
  }),
});

export const userFeedParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
    audience: z.enum(audiences).optional(),
  }),
});

export const commentActionSchema = z.object({
  params: z.object({
    postId: z.string().uuid(),
    commentId: z.string().uuid(),
  }),
});

const reactionTypes = ['like', 'love', 'clap', 'fire', 'mind_blown', 'rocket'] as const;

export const reactToPostSchema = z.object({
  params: z.object({
    postId: z.string().uuid(),
  }),
  body: z.object({
    reaction_type: z.enum(reactionTypes),
  }),
});

export const votePollSchema = z.object({
  params: z.object({
    postId: z.string().uuid(),
  }),
  body: z.object({
    option_index: z.coerce.number().int().min(0).max(20),
  }),
});

export const searchUsersQuerySchema = z.object({
  query: z.object({
    q: z.string().min(1).max(50),
    limit: z.coerce.number().int().min(1).max(20).optional().default(10),
  }),
});
