const webpack = require('webpack');
const path = require('path');

const DashboardPlugin = require('webpack-dashboard/plugin');

const config = {
  mode: 'development',
  entry: {
    main: './assets/js/main.js',
  },
  output: {
    path: path.resolve(__dirname, "assets/latest/js"),
    publicPath: "/latest/js/",
    filename: "[name].min.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
      },
      {
        test: /\.css$/,
        include: /node_modules/,
        loaders: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    //alias: {
    //  'fabric': '../vendor/fabric/fabric.js',
    //  'xterm': '../vendor/xterm/xterm.js',
    //},
    extensions: ['.json', '.js', '.ts', '.tsx', '.css'],
  },
  devtool: 'inline-source-map',
  devServer: {
    port: 8002,
    host: '0.0.0.0',
    // Turn off live-reloading to avoid conflicts with ZenDesk.
    // See https://github.com/webpack/webpack-dev-server/issues/117
    // (Auto-recompiling aka watch mode still works)
    hot: false,
    inline: false,
    quiet: true,
  },
  plugins: [
    new DashboardPlugin({ port: 8002 }),
  ]
};

module.exports = config;

// vim: sts=2 sw=2 et
