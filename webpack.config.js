const webpack = require("webpack");
const autoprefixer = require("autoprefixer");

const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

// TODO(iridian): Figure out the clean and correct way to set up prod configuration; merely
// running 'webpack -p' is not sufficient to enable isProduction, as -p only enables
// NODE_ENV = 'production' for the source files not for webpack.config.js itself.
// See https://github.com/webpack/webpack/issues/2537 . Possible solution Candidates involve
// splitting the config to separate webpack.dev/prod/commin.config.js, or having some other way to
// signal production build (there are arguments that NODE_ENV is supposed to describe the execution
// environment, not the requested build and these two should not be conflated. I've no strong
// opinion on this yet).
// FIXME(iridian): On further attempts both -p as well as NODE_ENV=production break the actual
// builds later on down the line.
// So as it stands now a production build can be triggered manually by running
// `TARGET_ENV=production webpack`
const isProduction = (process.env.TARGET_ENV === "production");
const isLocal = (process.env.TARGET_ENV === "local");

if (isProduction) {
  console.log("Production webpack bundle - simple uglify (not full yet)");
} else if (isLocal) {
  console.log(`\n\nLOCAL webpack bundle - no uglify\n\n`);
} else {
  console.log(`\n\nNON-PRODUCTION webpack bundle - simple uglify\n\n`);
}

module.exports = {
  context: __dirname,
  devtool: "source-map",
  entry: [
    "./src/valaa-inspire/index.js",
  ],
  output: {
    path: __dirname + "/dist/public/js/",
    publicPath: "/js/",
    filename: "valaa-inspire.js",
  },
  externals: {
    babylonjs: "BABYLON",
  },
  node: {
    fs: "empty",
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV)
      }
    }),
    // Silences a console warning due to amdefine/require, coming through jstransform dependency.
    // In principle jstransform dependency should be eliminated in favor of babel jsx tools (as
    // esprima-fb is deprecated) but in practice VSX transformation relies on the custom
    // modifications of the locally expanded jsx-transform
    new webpack.ContextReplacementPlugin(/source-map/, /$^/),
    ...(isLocal ? [] : [new UglifyJSPlugin({
      parallel: true,
      sourceMap: !isProduction,
      uglifyOptions: {
        ecma: 8,
        warnings: false,
        parse: {},
        compress: isProduction && {},
        mangle: isProduction && {
          keep_classnames: false,
          keep_fnames: false,
        },
        output: {
          comments: false,
          beautify: false,
        },
        toplevel: false,
        nameCache: null,
        ie8: false,
        safari10: false,
      }
    })]),
  ],
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
      // { test: /\.css$/, exclude: /node_modules/, loader: "style-loader!css-loader" },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]",
          {
            loader: "postcss-loader",
            options: {
              plugins: function () { return [ autoprefixer({ browsers: ["last 2 versions"] }) ] }
            }
          },
        ],
        include: /src/,
      }
    ]
  },
  devServer: {
    disableHostCheck: true,
  },
};
