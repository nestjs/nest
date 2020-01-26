const baseConfig = require('./.eslintrc');

module.exports = {
  ...baseConfig,
  parserOptions: {
    project: 'tsconfig.spec.json',
    sourceType: 'module',
  },
  rules: {
    ...baseConfig.rules,
    '@typescript-eslint/no-empty-function': 'off',
  },
};
