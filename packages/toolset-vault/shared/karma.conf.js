// Karma configuration
// Generated on Fri Sep 22 2017 11:03:57 GMT+0300 (EEST)
const webpackConfig = require("./webpack.config.js");

module.exports = config => {
  config.set({
    plugins: [
      "karma-jasmine",
      "karma-chrome-launcher",
      "karma-webpack"
    ],

    proxies: {
      "/valaa.json": "http://inspire.valaa.com/game/inspire-project/latest/valaa.json",
      // FIXME(iridian): These are broken: inspire-project no longer exists as a path
      "/ui/vidget/": "http://inspire.valaa.com/game/inspire-project/latest/ui/vidget/"
    },


    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ["jasmine"],


    // list of files / patterns to load in the browser
    files: [
      "e2e/**/*.js"
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      // add webpack as preprocessor
      "e2e/**/*.js": ["webpack"],
    },

    webpack: {
      node: webpackConfig.node,
      plugins: webpackConfig.plugins,
      context: webpackConfig.context,
      module: webpackConfig.module,
      postcss: webpackConfig.postcss,
      devServer: webpackConfig.devServer,
    },

    webpackMiddleware: {
      noInfo: true,
      stats: {
        chunks: false
      }
    },


    // test results reporter to use
    // possible values: "dots", "progress"
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ["dots"],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN ||
    //                  config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_ERROR,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ["Chrome"],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    // singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
