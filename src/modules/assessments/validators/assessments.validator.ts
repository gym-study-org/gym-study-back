import { z } from 'zod';

export const startAssessmentSchema = z.object({
  params: z.object({
    skillId: z.string().uuid('Invalid skill ID'),
  }),
  body: z.object({
    total_questions: z.number().int().min(5).max(30).optional().default(10),
    time_limit_minutes: z.number().int().min(5).max(60).optional().default(15),
  }).optional().default({}),
});

export const answerQuestionSchema = z.object({
  params: z.object({
    attemptId: z.string().uuid('Invalid attempt ID'),
  }),
  body: z.object({
    selected_answer: z.number().int().min(0).max(3),
  }),
});

export const completeAssessmentSchema = z.object({
  params: z.object({
    attemptId: z.string().uuid('Invalid attempt ID'),
  }),
});

export const userSkillsParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});

export const endorseSkillSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
    skillId: z.string().uuid('Invalid skill ID'),
  }),
  body: z.object({
    message: z.string().max(500).optional(),
  }).optional().default({}),
});

export const endorsementsParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});
