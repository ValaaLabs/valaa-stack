const path = require("path");
const shell = require("shelljs");

exports.command = "build-release";
exports.summary = "builds all modified authollery components (preparing for deploy)";
exports.describe = `${exports.summary} into a temporary dist target`;

exports.builder = (yargs) => yargs.options({
  target: {
    type: "string", default: "dist/release",
    description: "target directory root for building the release"
  },
  source: {
    type: "string", default: "packages",
    description: "relative lerna packages source directory for sourcing the packages"
  },
});

exports.handler = (yargv) => {
  const packageConfig = yargv.vlm.packageConfig;
  const packageName = packageConfig.name.replace(/\//g, "_");

  const releasePath = path.posix.join(yargv.target, `${packageName}-${packageConfig.version}`);
  if (shell.test("-d", releasePath)) {
    if (packageConfig.version.indexOf("-prerelease") !== -1) {
      console.warn("valma-build-release: removing an existing '-prerelease' build target:",
          releasePath);
      shell.rm("-rf", releasePath);
    } else {
      throw new Error(`valma-build-release: existing build for non-prerelease version ${
        packageConfig.version} found at ${releasePath}. Bump the version number?`);
    }
  }

  shell.mkdir("-p", releasePath);

  console.log("valma-build-release: building version", packageConfig.version, "of",
      packageConfig.name, "into", releasePath);

  Object.assign(yargv.vlm, {
    prepareModuleBuild,
    prepareModuleComponentBuild,
  });
  return yargv.vlm.callValma(".build-release/**/*", [releasePath]);

  /**
   * Validates module build pre-conditions and returns the module target dist path where the actual
   * build will be placed.
   *
   * @param {*} moduleName
   * @param {*} releasePath
   * @returns
   */
  function prepareModuleBuild (moduleName) {
    const moduleConfig = ((this.valmaConfig || {}).module || {})[moduleName];
    if (!moduleConfig) {
      throw new Error(`valma-build-release: valma.json:module["${moduleName}"] missing`);
    }
    if (!shell.test("-d", releasePath)) {
      throw new Error(`valma-build-release/${moduleName}: releasePath directory '${
          releasePath}' missing`);
    }
    const moduleReleasePath = `${releasePath}/${moduleName}`;
    console.log(`valma-build-release/${moduleName}: building site front release components in`,
        moduleReleasePath);
    return { moduleConfig, moduleReleasePath };
  }

  function prepareModuleComponentBuild (moduleConfig, moduleReleasePath,
      componentName, componentDescription, desiredVersionHash) {
    const componentReleasePath = `${moduleReleasePath}/${componentName}`;
    const componentConfig = moduleConfig[componentName];
    if ((desiredVersionHash !== undefined)
        && ((componentConfig || {}).deployedVersionHash === desiredVersionHash)) {
      console.log(`valma-build-release/${componentName}: skipping the build of ${
          componentDescription} release with version hash '${desiredVersionHash
          }' as a release with this version has already been deployed`);
      return undefined;
    }
    console.log(`valma-build-release/${componentName}: building ${componentDescription
        } release in '${componentReleasePath}'`);
    return componentReleasePath;
  }
};
