import packageConfiguration from "../../../package";
import path from "path";

module.exports = () => {
  // @todo Peter, cleanup, see build.babel.js
  const version = (process.env.TARGET_VERSION) ? process.env.TARGET_VERSION : packageConfiguration['version'];

  // lets see if we actually know how to deploy this environment
  const environment = (process.env.TARGET_ENV) ? process.env.TARGET_ENV : "develop";

  const buildPath = (process.env.TARGET_BUILDPATH) ?
    process.env.TARGET_BUILDPATH : path.resolve(`./dist/import/inspire-engine.${version}`);

  const sourcePath = (process.env.TARGET_SRCPATH) ? process.env.TARGET_SRCPATH : path.resolve("./");

  const environmentConfigurationJson = require(`${sourcePath}/environments/environments`);

  if (!(environment in environmentConfigurationJson)) {
    return cb(new Error(`Error, there is no configuration for environment: ${environment}`));
  }

  const environmentConfiguration = environmentConfigurationJson[environment];

  return {
    version,
    environment,
    buildPath,
    sourcePath,
    environmentConfiguration
  }
};
