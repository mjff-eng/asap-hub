const { resolve } = require('path');
const makeDefaultConfig = require('../../jest/make-default-config');

const config = makeDefaultConfig(resolve(__dirname, '..'), 'demo-server');

module.exports = {
  ...config,
  setupFiles: [...(config.setupFiles || []), '<rootDir>/test/setup-env.js'],
};
