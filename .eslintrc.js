module.exports = {
  root: true,
  env: {
    node: true,
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-unsafe-function-type': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-wrapper-object-types': 'off',
      },
    },
    {
      files: ['**/*.spec.ts', 'integration/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: 'tsconfig.spec.json',
        sourceType: 'module',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-unsafe-function-type': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-wrapper-object-types': 'off',
      },
    }
  ]
};
