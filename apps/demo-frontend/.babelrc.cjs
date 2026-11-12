module.exports = {
  presets: [
    [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
    require.resolve('babel-preset-vite'),
  ],
};
