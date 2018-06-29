#!/usr/bin/env vlm

exports.command = "release-build";
exports.describe = "Build all toolset sub-releases which have source modifications";
exports.introduction = `${exports.describe}.

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

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const packageConfig = vlm.packageConfig;
  const releasePath = yargv.target;

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
    prepareToolBuild,
  });
  return await vlm.invoke(".release-build/**/*", [releasePath]);
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
  const logger = this.tailor({ contextCommand: `release-build/${toolsetName}` });
  const releasePath = this.releasePath;
  if (!this.shell.test("-d", releasePath)) {
    throw new Error(`valma-release-build/${toolsetName}: releasePath directory '${
        releasePath}' missing`);
  }
  const toolsetConfig = this.getToolsetConfig(toolsetName);
  if (!toolsetConfig) return {};
  if ((toolsetConfig.deployedVersionHash === desiredVersionHash) && desiredVersionHash) {
    logger.info(`Skipping the build of already deployed release version ${
        desiredVersionHash} by toolset ${toolsetDescription}`);
    return {};
  }
  const simpleToolsetName = toolsetName.replace(/\//g, "_");
  const toolsetReleasePath = this.path.join(releasePath, simpleToolsetName);
  logger.info(`building ${toolsetDescription} release in`, toolsetReleasePath);
  this.shell.rm("-rf", toolsetReleasePath);
  this.shell.mkdir("-p", toolsetReleasePath);
  this.toolset = toolsetName;
  return { toolsetConfig, toolsetReleasePath };
}

function prepareToolBuild (toolsetName, toolName,
    toolDescription = "tool sub-release", desiredVersionHash) {
  const logger = this.tailor({ contextCommand: `release-build/${toolName}` });
  const toolConfig = this.getToolConfig(toolsetName, toolName);
  if (!toolConfig) return {};
  if ((toolConfig.deployedVersionHash === desiredVersionHash) && desiredVersionHash) {
    logger.info(`skipping the build of already deployed release version ${
        desiredVersionHash} of tool ${toolDescription}`);
    return {};
  }
  const simpleToolsetName = toolsetName.replace(/\//g, "_");
  const simpleToolName = toolName.replace(/\//g, "_");
  const toolReleasePath = this.path.join(this.releasePath, simpleToolsetName, simpleToolName);
  logger.info(`building ${toolDescription} release in '${toolReleasePath}'`);
  this.shell.rm("-rf", toolReleasePath);
  this.shell.mkdir("-p", toolReleasePath);
  return { toolConfig, toolReleasePath };
}
