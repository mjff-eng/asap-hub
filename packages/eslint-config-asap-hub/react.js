const { overrides } = require('.');

// Warn when hooks don't include a dependency array (even if empty)
const hookDependencyRule = {
  selector:
    'CallExpression[callee.name=/^use(Effect|LayoutEffect|ImperativeHandle|Callback|Memo)$/][arguments.length=1]',
  message:
    'Consider adding a dependency array to this hook. Omitting it means the effect runs after every render. Use an empty array [] if you want it to run only once on mount.',
};

const colourMessage =
  'Use a CAS colour from `colour` (a theme token such as colour.foreground.primary, or a primitive such as colour.neutral[700]) instead of a hard-coded value. See Storybook > CAS Design System / Colours.';
const hexColour =
  '/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z_-])/';
const functionalColour = '/(^|[^a-zA-Z-])(rgba?|hsla?)\\(/';
const colourRules = [
  `Literal[value=${hexColour}]`,
  `TemplateElement[value.raw=${hexColour}]`,
  `Literal[value=${functionalColour}]`,
  `TemplateElement[value.raw=${functionalColour}]`,
].map((selector) => ({ selector, message: colourMessage }));

const colourDefinitionFiles = [
  '**/colors.ts',
  '**/*.generated.ts',
  '**/icons/**',
  '**/images/**',
  '**/__tests__/**',
  '**/__mocks__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.stories.tsx',
];

module.exports = {
  extends: [
    '@asap-hub/eslint-config-asap-hub',
    'eslint-config-react-app',
    'eslint-config-prettier',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',

    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',

    // testing-library's waitFor is sometimes used in beforeEach and requires an expect inside
    'jest/no-standalone-expect': 'off',

    'no-restricted-syntax': ['warn', hookDependencyRule, ...colourRules],
  },
  overrides: [
    ...overrides,
    {
      files: colourDefinitionFiles,
      rules: {
        'no-restricted-syntax': ['warn', hookDependencyRule],
      },
    },
  ],
};
