import baseConfig from '@clawboy/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': 'off', // CLI tool needs console output
    },
  },
];
