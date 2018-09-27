const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  devtool: 'inline-cheap-source-map',
  resolve: {
    plugins: [
      // Needed because electron-webpack-ts doesn't support paths out of the box
      new TsConfigPathsPlugin(),
    ],
  },
};
