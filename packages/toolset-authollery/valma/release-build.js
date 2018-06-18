#!/usr/bin/env vlm

exports.command = "release-build";
exports.summary = "Build all authollery toolset sub-releases with modified config";
exports.describe = `${exports.summary}.
These sub-releases are placed under the provided dist target. This
command is first part of the two-part deployment with release-deploy
making the actual deployment.`;

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
    prepareToolsetBuild,
    prepareToolsetToolBuild,
  });
  return vlm.callValma(".release-build/**/*", [releasePath]);

  /**
   * Validates toolset build pre-conditions and returns the toolset target dist path where the
   * actual build will be placed.
   *
   * @param {*} toolsetName
   * @param {*} releasePath
   * @returns
   */
  function prepareToolsetBuild (toolsetName, toolsetDescription = "toolset sub-release",
      desiredVersionHash) {
    if (!vlm.shell.test("-d", releasePath)) {
      throw new Error(`valma-release-build/${toolsetName}: releasePath directory '${
          releasePath}' missing`);
    }
    const toolsetConfig = ((this.valmaConfig || {}).toolset || {})[toolsetName];
    if (!toolsetConfig) return {};
    if ((toolsetConfig.deployedVersionHash === desiredVersionHash) && desiredVersionHash) {
      if (this.verbosity >= 1) {
        console.log(`valma-release-build/${toolsetName
            }: skipping the build of already deployed release version ${desiredVersionHash
            } by toolset ${toolsetDescription}`);
      }
      return {};
    }
    const toolsetReleasePath = vlm.path.join(releasePath, toolsetName);
    console.log(`valma-release-build/${toolsetName}: building ${toolsetDescription} release in`,
        toolsetReleasePath);
    vlm.shell.rm("-rf", toolsetReleasePath);
    vlm.shell.mkdir("-p", toolsetReleasePath);
    return { toolsetConfig, toolsetReleasePath };
  }

  function prepareToolsetToolBuild (owningToolsetName, toolName,
      toolDescription = "tool sub-release", desiredVersionHash) {
    const toolConfig = ((this.valmaConfig || {}).tool || {})[toolName];
    if (!toolConfig) return {};
    if ((toolConfig.deployedVersionHash === desiredVersionHash) && desiredVersionHash) {
      if (this.verbosity >= 1) {
        console.log(`valma-release-build/${toolName
            }: skipping the build of already deployed release version ${desiredVersionHash
            } of tool ${toolDescription}`);
      }
      return {};
    }
    const toolReleasePath = vlm.path.join(releasePath, owningToolsetName, toolName);
    console.log(`valma-release-build/${toolName}: building ${toolDescription
        } release in '${toolReleasePath}'`);
    vlm.shell.rm("-rf", toolReleasePath);
    vlm.shell.mkdir("-p", toolReleasePath);
    return { toolConfig, toolReleasePath };
  }
};
