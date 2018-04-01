let path = require("path");
let fs = require("fs");

module.exports = {
  // find lambda functions from directory lambdas, assuming file = function
  entry: fs.readdirSync(path.join(__dirname, "./lambdas"))
    .filter(filename => /\.js$/.test(filename))
    .map(filename => {
      let entry = {};
      entry[filename.replace(".js", "")] = path.join(
        __dirname,
        "./lambdas/",
        filename
      );
      return entry;
    })
    .reduce((finalObject, entry) => Object.assign(finalObject, entry), {}),
  // write function + dependencies in one file for each function into dist/
  output: {
    path: path.join(__dirname, "dist"),
    library: "[name]",
    libraryTarget: "commonjs2",
    filename: "[name].js"
  },
  target: "node",
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: JSON.parse(
          // using inspire/.babelrc, might want own
          fs.readFileSync(path.join("..", "..", ".babelrc"), {encoding: "utf8"})
        )
      },
      {
        test: /\.json$/,
        loader: 'json'
      }
    ]
  }
};
