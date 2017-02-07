const webpack = require("webpack");

const config = {
  entry: {
    main: './assets/js/main.js',
  },
  output: {
    path: "./assets/[hash]/js",
    publicPath: "/[hash]/js/",
    filename: "[name].min.js",
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
    ],
  },
  devtool: 'hidden-source-map',
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false },
      sourceMap: true,
    }),
  ]
};

module.exports = config;

// vim: sts=2 sw=2 et
