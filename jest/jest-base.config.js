const { join, dirname } = require('path');

const root = dirname(require.resolve('asap-hub/package.json'), '..');

const testPathIgnorePatterns = [
  '\\.build-output-test\\.(js|jsx|ts|tsx)$',
  '\\.browser-test\\.(js|jsx|ts|tsx)$',
  '\\.integration-test\\.(js|jsx|ts|tsx)$',
  'gql/',
  '\\.contentful-app-extensions\\.',
];

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    require.resolve('./emotion-jsdom-setup.js'),
    require.resolve('./flags-setup-after-env.js'),
  ],

  cacheDirectory: join(root, '.jest-cache'),

  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      { configFile: require.resolve('../babel-cjs.config.js') },
    ],
  },

  moduleNameMapper: {
    '^@asap-hub/([^/]+)$': '@asap-hub/$1/src',
    '\\.(png|jpg|ico|jpeg|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      require.resolve('./imageMock.js'),
    uuid: require.resolve('uuid'),
    '^@tanstack/react-query-devtools(/production)?$': require.resolve(
      './react-query-devtools-mock.js',
    ),
    '^pdfjs-dist/legacy/(build/pdf|web/pdf_viewer)\\.mjs$': require.resolve(
      './pdfjs-dist-mock.js',
    ),
    '\\.css$|\\?url$': require.resolve('./imageMock.js'),
  },
  modulePathIgnorePatterns: [
    '<rootDir>/build(-cjs)?',
    '<rootDir>/dist',
    '<rootDir>/coverage',
    `<rootDir>/packages/services-common/src/cms/`,
    `/contentful-app-extensions/`,
  ],
  testPathIgnorePatterns,

  collectCoverageFrom: ['<rootDir>/src/**/*.{js,jsx,ts,tsx}'],
  coveragePathIgnorePatterns: testPathIgnorePatterns,
};
