var webpack = require("webpack");

module.exports = {
  entry: {
    drawing: "./assets/js/drawing.js",
    main: "./assets/js/main.js"
  },
  output: {
    path: "./assets/[hash]/js",
    filename: "[name].min.js",
  },
  devtool: '#source-map',
  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
  ]
};

// vim: sts=2 sw=4 et
