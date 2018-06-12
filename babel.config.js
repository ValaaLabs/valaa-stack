module.exports = function configureBabel (api) {
  api.cache(false);

  const ret = {
    ignore: ["node_modules/**/*"],
    presets: [
      "@babel/preset-env",
      "@babel/preset-react",
      ["@babel/preset-stage-0", { decoratorsLegacy: true }],
    ],
    plugins: [
      /*
      ["@babel/plugin-transform-runtime", {
        // There is a bug with babel 7.0.0-beta.49: https://github.com/babel/babel/issues/8061
        helpers: false,
        // regenerator:true would remove global.regeneratorRuntime which some libraries need
        // (notably: indexeddbshim)
        regenerator: false,
      }],
      */
      ["babel-plugin-root-import", { rootPathSuffix: "packages" }],
      "@babel/plugin-transform-flow-strip-types",
      ["@babel/plugin-proposal-decorators", { legacy: true }],
    ],
  };
  ret.env = {
    development: {},
    test: {},
    "assemble-packages": {
      plugins: [
        // ["@babel/plugin-transform-runtime", { helpers: false, regenerator: false }],
        ["module-resolver", { root: ["./packages"], alias: { "~": "@valos" } }],
        "@babel/plugin-transform-flow-strip-types",
        ["@babel/plugin-proposal-decorators", { legacy: true }],
      ]
    },
    production: {},
  };
  return ret;
};
