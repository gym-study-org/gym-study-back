import { pool } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import { getCacheOrFetch, deleteCache } from '../../../shared/utils/cache.util';
import { NotificationService } from '../../notifications/services/notification.service';
import { logger } from '../../../shared/utils/logger.util';
import {
  SkillCategory,
  AssessmentQuestion,
  AssessmentAttempt,
  AnswerRecord,
  VerifiedSkillWithCategory,
  PeerEndorsementWithDetails,
  AssessmentStartResponse,
  QuestionForClient,
  AnswerResponse,
  AssessmentResult,
} from '../interfaces/assessment.interface';

const SKILLS_CACHE_KEY = 'assessments:skills';
const SKILLS_CACHE_TTL = 1800; // 30 min

export class AssessmentsService {
  /**
   * List all active skill categories
   */
  static async getSkillCategories(): Promise<SkillCategory[]> {
    return getCacheOrFetch(SKILLS_CACHE_KEY, async () => {
      const result = await pool.query<SkillCategory>(
        `SELECT * FROM skill_categories WHERE is_active = true ORDER BY sort_order ASC`
      );
      return result.rows;
    }, SKILLS_CACHE_TTL);
  }

  /**
   * Start an assessment for a skill
   */
  static async startAssessment(
    userId: string,
    skillId: string,
    totalQuestions: number,
    timeLimitMinutes: number
  ): Promise<AssessmentStartResponse> {
    // Verify skill exists
    const skillResult = await pool.query<SkillCategory>(
      'SELECT * FROM skill_categories WHERE id = $1 AND is_active = true',
      [skillId]
    );
    if (skillResult.rows.length === 0) {
      throw new AppError('Skill category not found', 404, 'SKILL_NOT_FOUND');
    }
    const skill = skillResult.rows[0];

    // Check for active attempts
    const activeAttempt = await pool.query(
      `SELECT id FROM assessment_attempts
       WHERE user_id = $1 AND skill_category_id = $2 AND status = 'in_progress'`,
      [userId, skillId]
    );
    if (activeAttempt.rows.length > 0) {
      throw new AppError(
        'You already have an active assessment for this skill. Complete or abandon it first.',
        409,
        'ACTIVE_ATTEMPT_EXISTS'
      );
    }

    // Select random questions with difficulty distribution
    const questionsResult = await pool.query<AssessmentQuestion>(
      `SELECT id, question, question_type, difficulty, options, correct_answer, explanation, time_limit_seconds
       FROM assessment_questions
       WHERE skill_category_id = $1 AND is_active = true
       ORDER BY RANDOM()
       LIMIT $2`,
      [skillId, totalQuestions]
    );

    if (questionsResult.rows.length < 5) {
      throw new AppError(
        'Not enough questions available for this skill',
        400,
        'INSUFFICIENT_QUESTIONS'
      );
    }

    const questions = questionsResult.rows;
    const questionIds = questions.map((q) => q.id);
    const expiresAt = new Date(Date.now() + timeLimitMinutes * 60 * 1000);

    // Create attempt
    const attemptResult = await pool.query<AssessmentAttempt>(
      `INSERT INTO assessment_attempts
        (user_id, skill_category_id, total_questions, question_ids, time_limit_minutes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, skillId, questions.length, questionIds, timeLimitMinutes, expiresAt]
    );
    const attempt = attemptResult.rows[0];

    // Build first question (without correct_answer)
    const firstQuestion = AssessmentsService.formatQuestionForClient(questions[0], 1, questions.length);

    return {
      attempt_id: attempt.id,
      skill: { code: skill.code, name: skill.name },
      total_questions: questions.length,
      time_limit_minutes: timeLimitMinutes,
      expires_at: expiresAt.toISOString(),
      first_question: firstQuestion,
    };
  }

  /**
   * Answer a question in an assessment
   */
  static async answerQuestion(
    userId: string,
    attemptId: string,
    selectedAnswer: number
  ): Promise<AnswerResponse> {
    // Get attempt
    const attemptResult = await pool.query<AssessmentAttempt>(
      `SELECT * FROM assessment_attempts WHERE id = $1 AND user_id = $2`,
      [attemptId, userId]
    );
    if (attemptResult.rows.length === 0) {
      throw new AppError('Assessment attempt not found', 404, 'ATTEMPT_NOT_FOUND');
    }
    const attempt = attemptResult.rows[0];

    if (attempt.status !== 'in_progress') {
      throw new AppError('This assessment is no longer active', 400, 'ATTEMPT_NOT_ACTIVE');
    }

    // Check if expired
    if (attempt.expires_at && new Date(attempt.expires_at) < new Date()) {
      await pool.query(
        `UPDATE assessment_attempts SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [attemptId]
      );
      throw new AppError('Assessment has expired', 400, 'ATTEMPT_EXPIRED');
    }

    const questionIndex = attempt.current_question_index;
    if (questionIndex >= attempt.question_ids.length) {
      throw new AppError('All questions already answered', 400, 'ALL_ANSWERED');
    }

    // Get current question
    const questionId = attempt.question_ids[questionIndex];
    const questionResult = await pool.query<AssessmentQuestion>(
      'SELECT * FROM assessment_questions WHERE id = $1',
      [questionId]
    );
    const question = questionResult.rows[0];

    const isCorrect = selectedAnswer === question.correct_answer;
    const answers: AnswerRecord[] = typeof attempt.answers === 'string'
      ? JSON.parse(attempt.answers)
      : attempt.answers || [];

    answers.push({
      question_id: questionId,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    });

    const newCorrectAnswers = attempt.correct_answers + (isCorrect ? 1 : 0);
    const newAnswered = attempt.answered_questions + 1;
    const newIndex = questionIndex + 1;

    // Update attempt
    await pool.query(
      `UPDATE assessment_attempts
       SET answered_questions = $1,
           correct_answers = $2,
           current_question_index = $3,
           answers = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [newAnswered, newCorrectAnswers, newIndex, JSON.stringify(answers), attemptId]
    );

    // Get next question if available
    let nextQuestion: QuestionForClient | null = null;
    if (newIndex < attempt.question_ids.length) {
      const nextId = attempt.question_ids[newIndex];
      const nextResult = await pool.query<AssessmentQuestion>(
        'SELECT id, question, question_type, difficulty, options, time_limit_seconds FROM assessment_questions WHERE id = $1',
        [nextId]
      );
      if (nextResult.rows.length > 0) {
        nextQuestion = AssessmentsService.formatQuestionForClient(
          nextResult.rows[0],
          newIndex + 1,
          attempt.total_questions
        );
      }
    }

    return {
      is_correct: isCorrect,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      next_question: nextQuestion,
      progress: {
        answered: newAnswered,
        total: attempt.total_questions,
        correct: newCorrectAnswers,
      },
    };
  }

  /**
   * Complete/finalize an assessment
   */
  static async completeAssessment(
    userId: string,
    attemptId: string
  ): Promise<AssessmentResult> {
    const attemptResult = await pool.query<AssessmentAttempt>(
      `SELECT * FROM assessment_attempts WHERE id = $1 AND user_id = $2`,
      [attemptId, userId]
    );
    if (attemptResult.rows.length === 0) {
      throw new AppError('Assessment attempt not found', 404, 'ATTEMPT_NOT_FOUND');
    }
    const attempt = attemptResult.rows[0];

    if (attempt.status !== 'in_progress') {
      throw new AppError('This assessment is no longer active', 400, 'ATTEMPT_NOT_ACTIVE');
    }

    const score = attempt.total_questions > 0
      ? (attempt.correct_answers / attempt.total_questions) * 100
      : 0;
    const passed = score >= 70;
    const timeTaken = Math.floor(
      (Date.now() - new Date(attempt.started_at).getTime()) / 1000
    );

    // Update attempt
    await pool.query(
      `UPDATE assessment_attempts
       SET status = 'completed', score = $1, passed = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [score, passed, attemptId]
    );

    // Get skill info
    const skillResult = await pool.query<SkillCategory>(
      'SELECT code, name FROM skill_categories WHERE id = $1',
      [attempt.skill_category_id]
    );
    const skill = skillResult.rows[0];

    let levelAchieved: string | null = null;
    let verifiedSkillCreated = false;

    // If passed, create/update verified skill
    if (passed) {
      levelAchieved = AssessmentsService.calculateLevel(score);

      await pool.query(
        `INSERT INTO verified_skills (user_id, skill_category_id, verification_type, assessment_attempt_id, score, level)
         VALUES ($1, $2, 'assessment', $3, $4, $5)
         ON CONFLICT (user_id, skill_category_id, verification_type)
         DO UPDATE SET
           assessment_attempt_id = $3,
           score = $4,
           level = $5,
           verified_at = NOW(),
           expires_at = NOW() + INTERVAL '12 months',
           is_active = true,
           updated_at = NOW()`,
        [userId, attempt.skill_category_id, attemptId, score, levelAchieved]
      );
      verifiedSkillCreated = true;

      // Invalidate user skills cache
      await deleteCache(`assessments:user_skills:${userId}`).catch(() => {});
    }

    return {
      attempt_id: attemptId,
      skill: { code: skill.code, name: skill.name },
      score: Math.round(score * 100) / 100,
      passed,
      total_questions: attempt.total_questions,
      correct_answers: attempt.correct_answers,
      time_taken_seconds: timeTaken,
      level_achieved: levelAchieved,
      verified_skill_created: verifiedSkillCreated,
    };
  }

  /**
   * Get user's assessment results
   */
  static async getMyResults(userId: string): Promise<AssessmentAttempt[]> {
    const result = await pool.query<AssessmentAttempt>(
      `SELECT aa.*, sc.code AS skill_code, sc.name AS skill_name
       FROM assessment_attempts aa
       JOIN skill_categories sc ON sc.id = aa.skill_category_id
       WHERE aa.user_id = $1 AND aa.status IN ('completed', 'expired')
       ORDER BY aa.completed_at DESC NULLS LAST
       LIMIT 50`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get verified skills for a user (public)
   */
  static async getUserVerifiedSkills(userId: string): Promise<VerifiedSkillWithCategory[]> {
    const cacheKey = `assessments:user_skills:${userId}`;
    return getCacheOrFetch(cacheKey, async () => {
      const result = await pool.query<VerifiedSkillWithCategory>(
        `SELECT vs.*,
                sc.code AS skill_code,
                sc.name AS skill_name,
                sc.icon AS skill_icon
         FROM verified_skills vs
         JOIN skill_categories sc ON sc.id = vs.skill_category_id
         WHERE vs.user_id = $1 AND vs.is_active = true
         ORDER BY vs.score DESC`,
        [userId]
      );
      return result.rows;
    }, 300);
  }

  // === Peer Endorsements ===

  /**
   * Endorse a friend's skill
   */
  static async endorseSkill(
    endorserId: string,
    endorsedId: string,
    skillId: string,
    message?: string
  ): Promise<void> {
    if (endorserId === endorsedId) {
      throw new AppError('You cannot endorse yourself', 400, 'SELF_ENDORSEMENT');
    }

    // Verify friendship
    const friendCheck = await pool.query(
      `SELECT id FROM friendships
       WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
         AND status = 'accepted'`,
      [endorserId, endorsedId]
    );
    if (friendCheck.rows.length === 0) {
      throw new AppError('You can only endorse friends', 403, 'NOT_FRIENDS');
    }

    // Verify skill exists
    const skillCheck = await pool.query(
      'SELECT id FROM skill_categories WHERE id = $1 AND is_active = true',
      [skillId]
    );
    if (skillCheck.rows.length === 0) {
      throw new AppError('Skill category not found', 404, 'SKILL_NOT_FOUND');
    }

    try {
      await pool.query(
        `INSERT INTO peer_endorsements (endorser_id, endorsed_id, skill_category_id, message)
         VALUES ($1, $2, $3, $4)`,
        [endorserId, endorsedId, skillId, message || null]
      );
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new AppError('You have already endorsed this skill for this user', 409, 'ALREADY_ENDORSED');
      }
      throw err;
    }

    // Invalidate cached skills
    await deleteCache(`assessments:user_skills:${endorsedId}`).catch(() => {});

    // Notify endorsed user
    const endorserResult = await pool.query('SELECT username FROM users WHERE id = $1', [endorserId]);
    const skillResult = await pool.query('SELECT name FROM skill_categories WHERE id = $1', [skillId]);
    const endorserName = endorserResult.rows[0]?.username || 'Someone';
    const skillName = skillResult.rows[0]?.name || 'a skill';

    NotificationService.createNotification({
      user_id: endorsedId,
      actor_id: endorserId,
      type: 'endorsement_received',
      title: 'New skill endorsement',
      body: `${endorserName} endorsed your ${skillName} skill`,
      reference_type: 'skill',
      reference_id: skillId,
    }).catch((err) => logger.error('Error creating endorsement notification:', err));
  }

  /**
   * Remove an endorsement
   */
  static async removeEndorsement(
    endorserId: string,
    endorsedId: string,
    skillId: string
  ): Promise<void> {
    const result = await pool.query(
      `DELETE FROM peer_endorsements
       WHERE endorser_id = $1 AND endorsed_id = $2 AND skill_category_id = $3`,
      [endorserId, endorsedId, skillId]
    );
    if (result.rowCount === 0) {
      throw new AppError('Endorsement not found', 404, 'ENDORSEMENT_NOT_FOUND');
    }
    await deleteCache(`assessments:user_skills:${endorsedId}`).catch(() => {});
  }

  /**
   * Get endorsements for a user
   */
  static async getUserEndorsements(userId: string): Promise<PeerEndorsementWithDetails[]> {
    const result = await pool.query<PeerEndorsementWithDetails>(
      `SELECT pe.*,
              u.username AS endorser_username,
              u.avatar_url AS endorser_avatar_url,
              sc.code AS skill_code,
              sc.name AS skill_name
       FROM peer_endorsements pe
       JOIN users u ON u.id = pe.endorser_id
       JOIN skill_categories sc ON sc.id = pe.skill_category_id
       WHERE pe.endorsed_id = $1
       ORDER BY pe.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // === Helpers ===

  private static formatQuestionForClient(
    question: AssessmentQuestion,
    questionNumber: number,
    totalQuestions: number
  ): QuestionForClient {
    const options = typeof question.options === 'string'
      ? JSON.parse(question.options)
      : question.options;

    return {
      id: question.id,
      question: question.question,
      question_type: question.question_type,
      difficulty: question.difficulty,
      options,
      time_limit_seconds: question.time_limit_seconds,
      question_number: questionNumber,
      total_questions: totalQuestions,
    };
  }

  private static calculateLevel(score: number): string {
    if (score >= 95) return 'expert';
    if (score >= 85) return 'advanced';
    if (score >= 70) return 'intermediate';
    return 'beginner';
  }
}
