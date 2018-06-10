const shell = require("shelljs");
const path = require("path");

exports.command = "deploy-release [moduleglob]";
exports.summary = "deploys the prepared releases to their corresponding backends";
exports.describe = `${exports.summary}`;

exports.builder = (yargs) => yargs.options({
  source: {
    type: "string", default: "dist/release",
    description: `source directory for the releases that are to be deployed. ${
        ""}Each release in this directory will be removed after a successful deployment.`,
  },
  prerelease: {
    type: "boolean", default: false,
    description: "allow prerelease deployments",
  }
});

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const packageConfig = vlm.packageConfig;
  const packageName = packageConfig.name.replace(/\//g, "_");

  const releasePath = path.posix.join(yargv.source, `${packageName}-${packageConfig.version}`);

  if (!yargv.prerelease && (packageConfig.version.indexOf("-prerelease") !== -1)) {
    throw new Error(`valma-deploy-release: cannot deploy a release with a '-prerelease' version${
        ""} (provide '--prerelease' option to override).`);
  }

  if (!shell.test("-d", releasePath)) {
    throw new Error(`valma-deploy-release: cannot find a release build for version '${
        packageConfig.version}' version in "${releasePath}".`);
  }
  console.log("\nvalma-deploy-release: deploying", packageConfig.name, packageConfig.version,
      "from", releasePath);

  Object.assign(vlm, {
    locateModuleRelease,
    locateComponentRelease,
  });
  return vlm.callValma(".deploy-release/**/*", [releasePath]);

  function locateModuleRelease (moduleName) {
    const logPrefix = `valma-deploy-release/${moduleName}`;
    const moduleConfig = ((vlm.valmaConfig || {}).module || {})[moduleName];
    if (!moduleConfig) {
      throw new Error(`${logPrefix}: valma.json:module["${moduleName}"] missing`);
    }
    if (!shell.test("-d", releasePath)) {
      throw new Error(`${logPrefix}: releasePath directory '${releasePath}' missing`);
    }
    const moduleReleasePath = `${releasePath}/aws-site-front`;
    if (!shell.test("-d", moduleReleasePath)) return {};
    return { moduleConfig, moduleReleasePath };
  }

  function locateComponentRelease (moduleReleasePath, componentName, componentDescription) {
    const logPrefix = `valma-deploy-release/${componentName}`;
    const componentReleasePath = `${moduleReleasePath}/${componentName}`;
    if (!shell.test("-d", componentReleasePath)) {
      if (vlm.verbosity >= 1) {
        console.log(`${logPrefix}: skipping ${componentDescription}: no release at '${
          componentReleasePath}'`);
      }
      return undefined;
    }
    console.log(`${logPrefix}: deploying ${componentDescription} release from '${
        componentReleasePath}'`);
    return componentReleasePath;
  }
};
