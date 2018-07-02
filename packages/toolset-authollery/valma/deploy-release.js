#!/usr/bin/env vlm

// 'deploy' first so tab-completion is instant. Everything else 'release' first so build and
// deploy commands get listed next to each other.
exports.vlm = { toolset: "@valos/toolset-authollery" };
exports.command = "deploy-release [toolsetglob]";
exports.describe = "Deploy previously built releases to their deployment targets";
exports.introduction = `${exports.describe}.`;

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
  const releasePath = yargv.source;

  if (!yargv.prerelease && (packageConfig.version.indexOf("-prerelease") !== -1)) {
    throw new Error(`deploy-release: cannot deploy a release with a '-prerelease' version${
        ""} (provide '--prerelease' option to override).`);
  }

  if (!vlm.shell.test("-d", releasePath)) {
    throw new Error(`deploy-release: cannot find a release build for version '${
        packageConfig.version}' version in "${releasePath}".`);
  }

  vlm.info(`deploying '${packageConfig.name}' ${packageConfig.version}`, "from", releasePath);

  Object.assign(vlm, {
    releasePath,
    locateToolsetRelease,
    locateToolRelease,
  });
  return vlm.invoke(".release-deploy/**/*", [releasePath]);
};

function locateToolsetRelease (toolsetName, toolsetDescription = "toolset") {
  const logger = this.tailor({ contextCommand: `deploy-release/${toolsetName}` });
  const releasePath = this.releasePath;
  const toolsetConfig = this.getToolsetConfig(toolsetName);
  if (!toolsetConfig) {
    throw new Error(`${this.contextCommand}: toolsets.json:['${toolsetName}] missing`);
  }
  if (!this.shell.test("-d", releasePath)) {
    throw new Error(`${this.contextCommand}: releasePath directory '${releasePath}' missing`);
  }
  const toolsetReleasePath = this.path.join(releasePath, toolsetName);
  if (!this.shell.test("-d", toolsetReleasePath)) {
    logger.ifVerbose(1)
        .info(`skipping ${toolsetDescription} deploy: no release at '${toolsetReleasePath}'`);
    return {};
  }
  logger.info(`deploying ${toolsetDescription} release from '${toolsetReleasePath}'`);
  this.toolset = toolsetName;
  return { toolsetConfig, toolsetReleasePath };
}

function locateToolRelease (toolsetName, toolName, toolDescription = "tool") {
  const logger = this.tailor({ contextCommand: `deploy-release/${toolName}` });
  const releasePath = this.releasePath;
  const toolConfig = this.getToolConfig(toolsetName, toolName);
  const toolReleasePath = this.path.join(releasePath, toolsetName, toolName);
  if (!this.shell.test("-d", toolReleasePath)) {
    logger.ifVerbose(1)
        .info(`skipping ${toolDescription} deploy: no release at '${toolReleasePath}'`);
    return {};
  }
  logger.info(`deploying ${toolDescription} release from '${toolReleasePath}'`);
  return { toolConfig, toolReleasePath };
}
