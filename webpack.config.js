var webpack = require("webpack");

module.exports = {
  entry: ["./assets/js/main.js"],
  output: {
    path: "./assets/[hash]/js",
    publicPath: "/[hash]/js/",
    filename: "[name].min.js",
  },
  devtool: '#source-map',
  plugins: [
    new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false }}),
  ]
};

// vim: sts=2 sw=2 et
