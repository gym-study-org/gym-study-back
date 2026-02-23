import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    subject: z.string().max(100).optional(),
    is_public: z.boolean().optional().default(true),
    max_members: z.number().int().min(2).max(50).optional().default(20),
  }),
});

export const updateGroupSchema = z.object({
  params: z.object({
    groupId: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    subject: z.string().max(100).optional(),
    is_public: z.boolean().optional(),
    max_members: z.number().int().min(2).max(50).optional(),
  }),
});

export const groupIdParamSchema = z.object({
  params: z.object({
    groupId: z.string().uuid(),
  }),
});

export const groupMemberActionSchema = z.object({
  params: z.object({
    groupId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    groupId: z.string().uuid(),
  }),
  body: z.object({
    content: z.string().min(1).max(2000),
    message_type: z.enum(['text', 'study_share']).optional().default('text'),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const groupListQuerySchema = z.object({
  query: z.object({
    filter: z.enum(['my', 'public', 'all']).optional().default('all'),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
  }),
});

export const groupMessagesQuerySchema = z.object({
  params: z.object({
    groupId: z.string().uuid(),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(30),
    cursor: z.string().optional(),
  }),
});
