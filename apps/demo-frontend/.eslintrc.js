module.exports = {
  extends: ['@asap-hub/eslint-config-asap-hub/react'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*test.ts',
          '**/*test.tsx',
          '**/*__mocks__/*.ts',
          '**/test-utils.tsx',
        ],
      },
    ],
  },
};
