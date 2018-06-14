#!/usr/bin/env vlm

exports.command = "release-build";
exports.summary = "Build all modified authollery components (preparing for deploy)";
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
  const vlm = yargv.vlm;
  const packageConfig = vlm.packageConfig;
  const packageName = packageConfig.name.replace(/\//g, "_");

  const releasePath = vlm.path.join(yargv.target, `${packageName}-${packageConfig.version}`);
  if (vlm.shell.test("-d", releasePath)) {
    if (packageConfig.version.indexOf("-prerelease") !== -1) {
      console.warn("valma-release-build: removing an existing '-prerelease' build target:",
          releasePath);
      vlm.shell.rm("-rf", releasePath);
    } else {
      throw new Error(`valma-release-build: existing build for non-prerelease version ${
        packageConfig.version} found at ${releasePath}. Bump the version number?`);
    }
  }

  vlm.shell.mkdir("-p", releasePath);

  console.log("valma-release-build: building version", packageConfig.version, "of",
      packageConfig.name, "into", releasePath);

  Object.assign(vlm, {
    prepareModuleBuild,
    prepareModuleComponentBuild,
  });
  return vlm.callValma(".release-build/**/*", [releasePath]);

  /**
   * Validates module build pre-conditions and returns the module target dist path where the actual
   * build will be placed.
   *
   * @param {*} moduleName
   * @param {*} releasePath
   * @returns
   */
  function prepareModuleBuild (moduleName, moduleDescription = "module",
      desiredVersionHash) {
    if (!vlm.shell.test("-d", releasePath)) {
      throw new Error(`valma-release-build/${moduleName}: releasePath directory '${
          releasePath}' missing`);
    }
    const moduleConfig = ((this.valmaConfig || {}).module || {})[moduleName];
    if (!moduleConfig) return {};
    if ((moduleConfig.deployedVersionHash === desiredVersionHash) && desiredVersionHash) {
      if (this.verbosity >= 1) {
        console.log(`valma-release-build/${moduleName
            }: skipping the build of already deployed release version ${desiredVersionHash
            } of module ${moduleDescription}`);
      }
      return {};
    }
    const moduleReleasePath = vlm.path.join(releasePath, moduleName);
    console.log(`valma-release-build/${moduleName}: building ${moduleDescription} release in`,
        moduleReleasePath);
    vlm.shell.rm("-rf", moduleReleasePath);
    vlm.shell.mkdir("-p", moduleReleasePath);
    return { moduleConfig, moduleReleasePath };
  }

  function prepareModuleComponentBuild (owningModuleName,
      componentName, componentDescription = "component sub-release", desiredVersionHash) {
    const componentConfig = ((this.valmaConfig || {}).component || {})[componentName];
    if (!componentConfig) return {};
    if ((componentConfig.deployedVersionHash === desiredVersionHash) && desiredVersionHash) {
      if (this.verbosity >= 1) {
        console.log(`valma-release-build/${componentName
            }: skipping the build of already deployed release version ${desiredVersionHash
            } of component ${componentDescription}`);
      }
      return {};
    }
    const componentReleasePath = vlm.path.join(releasePath, owningModuleName, componentName);
    console.log(`valma-release-build/${componentName}: building ${componentDescription
        } release in '${componentReleasePath}'`);
    vlm.shell.rm("-rf", componentReleasePath);
    vlm.shell.mkdir("-p", componentReleasePath);
    return { componentConfig, componentReleasePath };
  }
};
