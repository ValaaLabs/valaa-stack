const path = require("path");
const baseConfig = require("../../webpack.config.js");

module.exports = Object.assign(baseConfig, {
  target: "node",
  devtool: null,
  externals: [
    { "aws-sdk": "commonjs2 aws-sdk" }
  ],
  entry: [
    path.join(__dirname, "lambda", "verify-blob.js")
  ],
  output: {
    path: path.join(__dirname, "..", "..", "dist", "cloudformation", "lambda"),
    filename: "verify-blob.js",
    libraryTarget: "commonjs2",
  },
  plugins: [],
});