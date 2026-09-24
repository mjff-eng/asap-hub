const {
  defaults: { testMatch },
} = require('jest-config');
const testFiles = [...testMatch, '**/*{t,T}est*.{js,jsx,ts,tsx}'];

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      './tsconfig.eslint.json',
      './apps/*/tsconfig.json',
      './packages/*/tsconfig.json',
    ],
  },
  settings: {
    'import/resolver': require.resolve('./import-resolver'),
    jest: {
      version: require('jest-config/package.json').version,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-airbnb-base',
    'plugin:jest/recommended',
    'eslint-config-prettier',
    'prettier',
  ],
  rules: {
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: testFiles },
    ],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],

    'no-useless-constructor': 'off',
    'no-multi-assign': 'off',
    'no-nested-ternary': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-void': ['error', { allowAsStatement: true }],

    'lines-between-class-members': 'off',

    'default-param-last': 'off',
    '@typescript-eslint/default-param-last': 'error',

    'no-alert': 'off',
  },
  overrides: [
    {
      files: ['*.d.ts'],
      rules: {
        'spaced-comment': 'off',
      },
    },
    {
      files: testFiles,
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'no-var': 'off',
        'no-new-func': 'off',
        'no-eval': 'off',
      },
    },
  ],
};
