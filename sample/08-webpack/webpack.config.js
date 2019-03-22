const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const spawn = require('cross-spawn');

module.exports = {
  entry: ['webpack/hot/poll?100', './src/main.ts'],
  watch: true,
  target: 'node',
  externals: [
    nodeExternals({
      whitelist: ['webpack/hot/poll?100'],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  mode: 'development',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.WatchIgnorePlugin([/\.js$/, /\.d\.ts$/]),
    {
      apply: compiler => {
        let serverStarted = false;
        compiler.hooks.afterEmit.tap('StartApplication', compilation => {
          if (!serverStarted) {
            const child = spawn('npm', ['start'], {
              stdio: 'inherit',
              cwd: __dirname,
            });
            serverStarted = true;
          }
        });
      },
    },
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'server.js',
  },
};
