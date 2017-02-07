const webpack = require("webpack");

const Dashboard = require('webpack-dashboard');
const DashboardPlugin = require('webpack-dashboard/plugin');
let dashboard = new Dashboard();

const config = {
  entry: {
    main: './assets/js/main.js',
  },
  output: {
    path: "./assets/latest/js",
    publicPath: "/latest/js/",
    filename: "[name].min.js",
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
    ],
  },
  devtool: 'inline-source-map',
  devServer: {
    port: 8002,
    // Turn off live-reloading to avoid conflicts with ZenDesk.
    // See https://github.com/webpack/webpack-dev-server/issues/117
    // (Auto-recompiling aka watch mode still works)
    hot: false,
    inline: false
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false },
      sourceMap: true,
    }),
    new DashboardPlugin(dashboard.setData),
  ]
};

module.exports = config;

// vim: sts=2 sw=2 et
