module.exports = function configureBabel (api, rootPrefix) {
  if (api) {
    api.cache(false);
  }

  const ret = {
    ignore: ["node_modules/**/*"],
    presets: [
      "@babel/preset-env",
      "@babel/preset-react",
      ["@babel/preset-stage-0", { decoratorsLegacy: true, pipelineProposal: "minimal" }],
    ],
    plugins: [],
  };
  const plugins = {
    "@babel/plugin-transform-runtime": {
      // There is a bug with babel 7.0.0-beta.49: https://github.com/babel/babel/issues/8061
      helpers: false,
      // regenerator:true would remove global.regeneratorRuntime which some libraries need
      // (notably: indexeddbshim)
      regenerator: false,
    },
    "babel-plugin-root-import": { rootPathSuffix: "packages" },
    "@babel/plugin-proposal-decorators": { legacy: true },
    "@babel/plugin-transform-flow-strip-types": undefined,
  };
  if (process.env.TARGET_ENV === "package-assemble") {
    delete plugins["babel-plugin-root-import"];
    plugins["module-resolver"] = { root: ["./packages"], alias: { "~": rootPrefix } };
  }
  Object.keys(plugins).forEach(key =>
    ret.plugins.push(plugins[key] === undefined ? key : [key, plugins[key]]));
  return ret;
};
