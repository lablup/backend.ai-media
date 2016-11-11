var webpack = require("webpack");

var Dashboard = require('webpack-dashboard');
var DashboardPlugin = require('webpack-dashboard/plugin');
var dashboard = new Dashboard();

module.exports = {
  entry: ["./assets/js/main.js"],
  output: {
    path: "./assets/latest/js",
    publicPath: "/latest/js/",
    filename: "[name].min.js",
  },
  devtool: '#eval-source-map',
  devServer: {
    port: 8002,
    // Turn off live-reloading to avoid conflicts with ZenDesk.
    // See https://github.com/webpack/webpack-dev-server/issues/117
    // (Auto-recompiling aka watch mode still works)
    hot: false,
    inline: false
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false }}),
    new DashboardPlugin(dashboard.setData),
  ]
};

// vim: sts=2 sw=2 et
