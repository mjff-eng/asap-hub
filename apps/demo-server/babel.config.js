module.exports = {
  presets: [
    [require.resolve('@babel/preset-env'), { targets: { node: true } }],
    require.resolve('@babel/preset-typescript'),
  ],
};
