const reactConfig = require('@asap-hub/eslint-config-asap-hub/react');

const [, hookDependencyRule] = reactConfig.rules['no-restricted-syntax'];

module.exports = {
  extends: [
    '@asap-hub/eslint-config-asap-hub/react',
    'plugin:storybook/recommended',
  ],
  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/no-anonymous-default-export': 'off',
    'no-console': 'off',
    'no-restricted-syntax': ['warn', hookDependencyRule],
  },
};
