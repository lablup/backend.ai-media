const webpack = require("webpack");
const path = require('path');

const config = {
  mode: 'production',
  entry: {
    main: './assets/js/main.js',
  },
  output: {
    path: path.resolve(__dirname, "./assets/[hash]/js"),
    publicPath: "/[hash]/js/",
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
  devtool: 'hidden-source-map',
  plugins: [
  ]
};

module.exports = config;

// vim: sts=2 sw=2 et
