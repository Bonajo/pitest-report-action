/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  clearMocks: true,
  collectCoverage: true,
  // Include every source file, also the ones that are not imported by any test
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  // index.ts only calls run(), which is tested through main.ts
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', 'src/index.ts'],
  coverageReporters: ['lcov', 'text'],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  errorOnDeprecated: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js'],
  resolver: 'ts-jest-resolver',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }]
  },
  verbose: true
}
