#!/usr/bin/env vlm

exports.command = "release-deploy [toolsetglob]";
exports.summary = "Deploy previously built releases to their deployment targets";
exports.describe = `${exports.summary}.`;

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
    releasePath,
    locateToolsetRelease,
    locateToolsetToolRelease,
  });
  return vlm.invoke(".release-deploy/**/*", [releasePath]);
};

function locateToolsetRelease (toolsetName, toolsetDescription = "toolset") {
  const releasePath = this.releasePath;
  const logPrefix = `valma-release-deploy/${toolsetName}`;
  const toolsetConfig = ((this.valmaConfig || {}).toolset || {})[toolsetName];
  if (!toolsetConfig) {
    throw new Error(`${logPrefix}: valma.json:toolset['${toolsetName}] missing`);
  }
  if (!this.shell.test("-d", releasePath)) {
    throw new Error(`${logPrefix}: releasePath directory '${releasePath}' missing`);
  }
  const toolsetReleasePath = this.path.join(releasePath, toolsetName);
  if (!this.shell.test("-d", toolsetReleasePath)) {
    if (this.verbosity >= 1) {
      console.log(`${logPrefix}: skipping ${toolsetDescription} deploy: no release at '${
        toolsetReleasePath}'`);
    }
    return {};
  }
  console.log(`${logPrefix}: deploying ${toolsetDescription} release from '${
      toolsetReleasePath}'`);
  this.toolset = toolsetName;
  return { toolsetConfig, toolsetReleasePath };
}

function locateToolsetToolRelease (owningToolsetName, toolName, toolDescription = "tool") {
  const releasePath = this.releasePath;
  const logPrefix = `valma-release-deploy/${toolName}`;
  const toolConfig = ((this.valmaConfig || {}).toolset || {})[toolName];
  const toolReleasePath = this.path.join(releasePath, owningToolsetName, toolName);
  if (!this.shell.test("-d", toolReleasePath)) {
    if (this.verbosity >= 1) {
      console.log(`${logPrefix}: skipping ${toolDescription} deploy: no release at '${
        toolReleasePath}'`);
    }
    return {};
  }
  console.log(`${logPrefix}: deploying ${toolDescription} release from '${
      toolReleasePath}'`);
  return { toolConfig, toolReleasePath };
}
