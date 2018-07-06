#!/usr/bin/env vlm

// 'deploy' first so tab-completion is instant. Everything else 'release' first so build and
// deploy commands get listed next to each other.
exports.vlm = { toolset: "@valos/toolset-authollery" };
exports.command = "deploy-release [toolsetGlob]";
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

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const packageConfig = vlm.packageConfig;
  const releasePath = yargv.source;

  if (!yargv.prerelease && (packageConfig.version.indexOf("-prerelease") !== -1)) {
    throw new Error(`deploy-release: cannot deploy a release with a '-prerelease' version${
        ""} (provide '--prerelease' option to override).`);
  }

  if (!vlm.shell.test("-d", releasePath)) {
    throw new Error(`deploy-release: cannot find a release build for version '${
        vlm.colors.version(packageConfig.version)}' version in "${
          vlm.colors.path(releasePath)}".`);
  }

  vlm.info(`Deploying ${vlm.colors.package(packageConfig.name)}@${
      vlm.colors.version(packageConfig.version)}`, "from", vlm.colors.path(releasePath));

  return await vlm.invoke(`.release-deploy/${yargv.toolsetGlob || "**/*"}`,
      [...yargv._, releasePath]);
};
