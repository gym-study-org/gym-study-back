import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@modules/(.*)': '<rootDir>/src/modules/$1',
    '@shared/(.*)': '<rootDir>/src/shared/$1',
    '@database/(.*)': '<rootDir>/src/database/$1',
    '@websocket/(.*)': '<rootDir>/src/websocket/$1',
    '@jobs/(.*)': '<rootDir>/src/jobs/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.d.ts',
    '!src/database/migrations/**',
  ],
  clearMocks: true,
  verbose: true,
};

export default config;
