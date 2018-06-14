#!/usr/bin/env vlm

exports.command = "release-deploy [moduleglob]";
exports.summary = "Deploy previously prepared releases to their deployment targets";
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

  const releasePath = vlm.path.join(yargv.source, `${packageName}-${packageConfig.version}`);

  if (!yargv.prerelease && (packageConfig.version.indexOf("-prerelease") !== -1)) {
    throw new Error(`valma-release-deploy: cannot deploy a release with a '-prerelease' version${
        ""} (provide '--prerelease' option to override).`);
  }

  if (!vlm.shell.test("-d", releasePath)) {
    throw new Error(`valma-release-deploy: cannot find a release build for version '${
        packageConfig.version}' version in "${releasePath}".`);
  }
  console.log("\nvalma-release-deploy: deploying", packageConfig.name, packageConfig.version,
      "from", releasePath);

  Object.assign(vlm, {
    locateModuleRelease,
    locateModuleComponentRelease,
  });
  return vlm.callValma(".release-deploy/**/*", [releasePath]);

  function locateModuleRelease (moduleName, moduleDescription = "module") {
    const logPrefix = `valma-release-deploy/${moduleName}`;
    const moduleConfig = ((vlm.valmaConfig || {}).module || {})[moduleName];
    if (!moduleConfig) {
      throw new Error(`${logPrefix}: valma.json:module["${moduleName}"] missing`);
    }
    if (!vlm.shell.test("-d", releasePath)) {
      throw new Error(`${logPrefix}: releasePath directory '${releasePath}' missing`);
    }
    const moduleReleasePath = vlm.path.join(releasePath, moduleName);
    if (!vlm.shell.test("-d", moduleReleasePath)) {
      if (vlm.verbosity >= 1) {
        console.log(`${logPrefix}: skipping ${moduleDescription} deploy: no release at '${
          moduleReleasePath}'`);
      }
      return {};
    }
    console.log(`${logPrefix}: deploying ${moduleDescription} release from '${
        moduleReleasePath}'`);
    return { moduleConfig, moduleReleasePath };
  }

  function locateModuleComponentRelease (owningModuleName, componentName,
        componentDescription = "component") {
    const logPrefix = `valma-release-deploy/${componentName}`;
    const componentConfig = ((vlm.valmaConfig || {}).module || {})[componentName];
    const componentReleasePath = vlm.path.join(releasePath, owningModuleName, componentName);
    if (!vlm.shell.test("-d", componentReleasePath)) {
      if (vlm.verbosity >= 1) {
        console.log(`${logPrefix}: skipping ${componentDescription} deploy: no release at '${
          componentReleasePath}'`);
      }
      return {};
    }
    console.log(`${logPrefix}: deploying ${componentDescription} release from '${
        componentReleasePath}'`);
    return { componentConfig, componentReleasePath };
  }
};
