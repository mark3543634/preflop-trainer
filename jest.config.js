// Jest config for the PURE engine only (no React Native).
// The engine is fully decoupled from UI so it can be tested with plain ts-jest.
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.engine.json' }],
  },
};
