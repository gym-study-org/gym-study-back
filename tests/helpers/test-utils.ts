import { v4 as uuidv4 } from 'uuid';

export function createTestUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: uuidv4(),
    email: `test-${uuidv4()}@example.com`,
    username: `user_${uuidv4().slice(0, 8)}`,
    password: 'TestPassword123!',
    full_name: 'Test User',
    ...overrides,
  };
}

export function createTestSession(userId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: 'Test Study Session',
    subject: 'TypeScript',
    description: 'Testing study session creation',
    duration_minutes: 60,
    is_for_certification: false,
    tags: ['typescript', 'testing'],
    started_at: new Date().toISOString(),
    finished_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}
