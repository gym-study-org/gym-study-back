import { Request, Response, NextFunction } from 'express';
import { AssessmentsService } from '../services/assessments.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class AssessmentsController {
  /**
   * GET /api/assessments/skills
   */
  static async getSkills(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skills = await AssessmentsService.getSkillCategories();
      ResponseUtil.success(res, skills);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/assessments/start/:skillId
   */
  static async startAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { skillId } = req.params;
      const { total_questions = 10, time_limit_minutes = 15 } = req.body || {};

      const result = await AssessmentsService.startAssessment(
        userId,
        skillId,
        total_questions,
        time_limit_minutes
      );
      ResponseUtil.success(res, result, 'Assessment started', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/assessments/:attemptId/answer
   */
  static async answerQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { attemptId } = req.params;
      const { selected_answer } = req.body;

      const result = await AssessmentsService.answerQuestion(userId, attemptId, selected_answer);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/assessments/:attemptId/complete
   */
  static async completeAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { attemptId } = req.params;

      const result = await AssessmentsService.completeAssessment(userId, attemptId);
      ResponseUtil.success(res, result, result.passed ? 'Assessment passed!' : 'Assessment completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/assessments/my-results
   */
  static async getMyResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const results = await AssessmentsService.getMyResults(userId);
      ResponseUtil.success(res, results);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/assessments/user/:userId/skills
   */
  static async getUserSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const skills = await AssessmentsService.getUserVerifiedSkills(userId);
      ResponseUtil.success(res, skills);
    } catch (error) {
      next(error);
    }
  }

  // === Endorsements ===

  /**
   * POST /api/endorsements/:userId/:skillId
   */
  static async endorseSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const endorserId = req.user!.id;
      const { userId, skillId } = req.params;
      const { message } = req.body || {};

      await AssessmentsService.endorseSkill(endorserId, userId, skillId, message);
      ResponseUtil.success(res, null, 'Skill endorsed successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/endorsements/:userId/:skillId
   */
  static async removeEndorsement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const endorserId = req.user!.id;
      const { userId, skillId } = req.params;

      await AssessmentsService.removeEndorsement(endorserId, userId, skillId);
      ResponseUtil.success(res, null, 'Endorsement removed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/endorsements/user/:userId
   */
  static async getUserEndorsements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const endorsements = await AssessmentsService.getUserEndorsements(userId);
      ResponseUtil.success(res, endorsements);
    } catch (error) {
      next(error);
    }
  }
}
