module.exports = {
  rules: {
    'no-await-in-loop': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: true, optionalDependencies: false },
    ],
  },
};
