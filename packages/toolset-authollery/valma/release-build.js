#!/usr/bin/env vlm

exports.command = "release-build";
exports.summary = "Build all toolset sub-releases which have source modifications";
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
      vlm.warn("removing an existing '-prerelease' build target:", releasePath);
      vlm.shell.rm("-rf", releasePath);
    } else {
      throw new Error(`valma-release-build: existing build for non-prerelease version ${
        packageConfig.version} found at ${releasePath}. Bump the version number?`);
    }
  }

  vlm.shell.mkdir("-p", releasePath);

  vlm.info("building version", packageConfig.version, "of",
      packageConfig.name, "into", releasePath);

  Object.assign(vlm, {
    releasePath,
    prepareToolsetBuild,
    prepareToolsetToolBuild,
  });
  return vlm.invoke(".release-build/**/*", [releasePath]);
};

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
  const logger = this.tailor({ commandName: `valma-release-build/${toolsetName}` });
  const releasePath = this.releasePath;
  if (!this.shell.test("-d", releasePath)) {
    throw new Error(`valma-release-build/${toolsetName}: releasePath directory '${
        releasePath}' missing`);
  }
  const toolsetConfig = ((this.valmaConfig || {}).toolset || {})[toolsetName];
  if (!toolsetConfig) return {};
  if ((toolsetConfig.deployedVersionHash === desiredVersionHash) && desiredVersionHash) {
    logger.ifVerbose(1)
        .info(`skipping the build of already deployed release version ${desiredVersionHash
              } by toolset ${toolsetDescription}`);
    return {};
  }
  const toolsetReleasePath = this.path.join(releasePath, toolsetName);
  logger.info(`building ${toolsetDescription} release in`, toolsetReleasePath);
  this.shell.rm("-rf", toolsetReleasePath);
  this.shell.mkdir("-p", toolsetReleasePath);
  this.toolset = toolsetName;
  return { toolsetConfig, toolsetReleasePath };
}

function prepareToolsetToolBuild (owningToolsetName, toolName,
    toolDescription = "tool sub-release", desiredVersionHash) {
  const logger = this.tailor({ commandName: `valma-release-build/${toolName}` });
  const toolConfig = ((this.valmaConfig || {}).tool || {})[toolName];
  if (!toolConfig) return {};
  if ((toolConfig.deployedVersionHash === desiredVersionHash) && desiredVersionHash) {
    logger.ifVerbose(1)
        .info(`skipping the build of already deployed release version ${desiredVersionHash
            } of tool ${toolDescription}`);
    return {};
  }
  const toolReleasePath = this.path.join(this.releasePath, owningToolsetName, toolName);
  logger.info(`building ${toolDescription} release in '${toolReleasePath}'`);
  this.shell.rm("-rf", toolReleasePath);
  this.shell.mkdir("-p", toolReleasePath);
  return { toolConfig, toolReleasePath };
}
