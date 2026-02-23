import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/environment';
import { logger } from '../utils/logger.util';

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT || '587', 10),
    secure: env.SMTP_SECURE === 'true',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });
}

function loadTemplate(templateName: string): HandlebarsTemplateDelegate {
  const cached = templateCache.get(templateName);
  if (cached) return cached;

  const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.hbs`);
  const source = fs.readFileSync(templatePath, 'utf8');
  const compiled = Handlebars.compile(source);
  templateCache.set(templateName, compiled);
  return compiled;
}

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(`Email not sent (SMTP not configured): ${options.subject} -> ${options.to}`);
    return false;
  }

  try {
    const template = loadTemplate(options.template);
    const html = template(options.data);

    await transporter.sendMail({
      from: env.EMAIL_FROM || `"GYM-STUDY" <noreply@gymstudy.com>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    logger.info(`Email sent: ${options.subject} -> ${options.to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, username: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Welcome to GYM-STUDY!',
    template: 'welcome',
    data: { username, frontendUrl: env.FRONTEND_URL },
  });
}

export async function sendStreakWarningEmail(
  email: string,
  username: string,
  currentStreak: number
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Your ${currentStreak}-day streak is at risk!`,
    template: 'streak-warning',
    data: { username, currentStreak, frontendUrl: env.FRONTEND_URL },
  });
}

export async function sendWeeklySummaryEmail(
  email: string,
  username: string,
  stats: {
    total_hours: number;
    total_sessions: number;
    badges_earned: number;
    streak: number;
    rank_change: number;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your Weekly Study Summary - GYM-STUDY',
    template: 'weekly-summary',
    data: { username, ...stats, frontendUrl: env.FRONTEND_URL },
  });
}
