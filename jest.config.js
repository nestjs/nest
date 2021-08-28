module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/packages/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['<rootDir>/packages/**/*.ts'],
  collectCoverage: true,
  setupFiles: ['<rootDir>/global-setup.jest.js'],
  /* moduleNameMapper: {
    '^@nestjs\\/(.*)$': '<rootDir>/packages/$1',
  }, */
};
