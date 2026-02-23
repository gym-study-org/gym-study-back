import { Router } from 'express';
import { AssessmentsController } from './controllers/assessments.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import {
  startAssessmentSchema,
  answerQuestionSchema,
  completeAssessmentSchema,
  userSkillsParamSchema,
  endorseSkillSchema,
  endorsementsParamSchema,
} from './validators/assessments.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Skill categories
router.get('/skills', asyncHandler(AssessmentsController.getSkills));

// Assessment flow
router.post(
  '/start/:skillId',
  validateRequest(startAssessmentSchema),
  asyncHandler(AssessmentsController.startAssessment)
);
router.post(
  '/:attemptId/answer',
  validateRequest(answerQuestionSchema),
  asyncHandler(AssessmentsController.answerQuestion)
);
router.post(
  '/:attemptId/complete',
  validateRequest(completeAssessmentSchema),
  asyncHandler(AssessmentsController.completeAssessment)
);

// Results
router.get('/my-results', asyncHandler(AssessmentsController.getMyResults));
router.get(
  '/user/:userId/skills',
  validateRequest(userSkillsParamSchema),
  asyncHandler(AssessmentsController.getUserSkills)
);

// Endorsements
router.post(
  '/endorsements/:userId/:skillId',
  validateRequest(endorseSkillSchema),
  asyncHandler(AssessmentsController.endorseSkill)
);
router.delete(
  '/endorsements/:userId/:skillId',
  validateRequest(endorseSkillSchema),
  asyncHandler(AssessmentsController.removeEndorsement)
);
router.get(
  '/endorsements/user/:userId',
  validateRequest(endorsementsParamSchema),
  asyncHandler(AssessmentsController.getUserEndorsements)
);

export default router;
