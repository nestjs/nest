module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/integration/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['<rootDir>/packages/**/*.ts'],
  collectCoverage: true,
  setupFiles: ['<rootDir>/global-setup.jest.js'],
  moduleNameMapper: {
    '^@nestjs/graphql': '<rootDir>/node_modules/@nestjs/graphql',
    '^@nestjs/mapped-types': '<rootDir>/node_modules/@nestjs/mapped-types',
    '^@nestjs/mongoose': '<rootDir>/node_modules/@nestjs/mongoose',
    '^@nestjs/typeorm': '<rootDir>/node_modules/@nestjs/typeorm',
    '^@nestjs\\/(.*)$': '<rootDir>/packages/$1',
  },
};