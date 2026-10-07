const {
  setupFilesAfterEnv,
  moduleNameMapper,
  transform,
  ...baseConfig
} = require('../../jest/jest-base.config.js');

module.exports = {
  ...baseConfig,

  rootDir: __dirname,
  testEnvironment: 'jsdom',

  setupFilesAfterEnv: [
    ...(setupFilesAfterEnv || []),
    require.resolve('../../jest/dom-extensions-setup-after-env.js'),
  ],

  transform: {
    ...transform,
  },

  moduleNameMapper: {
    ...moduleNameMapper,
    '^@asap-hub/react-components/src/(.*)$':
      '<rootDir>/../../packages/react-components/src/$1',
  },

  displayName: 'test-demo-frontend',
};
