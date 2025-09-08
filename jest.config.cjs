/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  resolver: 'ts-jest-resolver',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1'
  },
};
