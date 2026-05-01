// jest.config.js
// W1-C6 NestJS unit-test configuration for @readmigo/backend-cn.
// Notes:
//   - Project uses ESM ("type": "module") + ts-jest ESM preset.
//   - Coverage threshold = 60% per spec; raise to 80% in Phase 2.
//   - Imports inside src/ use `.js` suffix (NodeNext); moduleNameMapper rewrites
//     them so Jest can resolve compiled ts-jest output.
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  // Map relative `*.js` imports (NodeNext style) back to the `.ts` source
  // when running through ts-jest.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: { warnOnly: true },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.ts',
    '!src/**/*.dto.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/database/data-source.ts',
    '!src/database/migrations/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  clearMocks: true,
  verbose: true,
};
