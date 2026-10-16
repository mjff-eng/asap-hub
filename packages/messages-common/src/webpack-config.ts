import { Configuration, IgnorePlugin } from 'webpack';
import { TemplatePlugin } from './template-plugin';

const configFactory = (
  appOrigin: string,
  outputDir: string,
): Configuration => ({
  target: 'node',
  mode: 'production',
  // To prevent duplicating the installed version of React into the output bundle - React does not like that
  externals: ['react', 'react-dom'],
  output: {
    libraryTarget: 'commonjs',
    path: outputDir,
  },
  module: {
    rules: [
      {
        test: [/\.gif$/, /\.jpg$/, /\.png$/],
        use: {
          loader: require.resolve('url-loader'),
          options: {
            esModule: false,
            limit: false,
            name: 'static/[name].[hash].[ext]',
          },
        },
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: require.resolve('babel-loader'),
        },
      },
    ],
  },
  plugins: [
    new IgnorePlugin({ resourceRegExp: /^@embedpdf\// }),
    TemplatePlugin(appOrigin),
  ],
});

export { configFactory };
