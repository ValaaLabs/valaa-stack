#!/usr/bin/env vlm

// 'build' first so tab-completion is instant. Everything else 'release' first so build and
// deploy commands get listed next to each other.
exports.vlm = { toolset: "@valos/toolset-authollery" };
exports.command = "build-release [toolsetGlob]";
exports.describe = "Build all toolset sub-releases which have source modifications";
exports.introduction = `${exports.describe}.

These sub-releases are placed under the provided dist target. This
command is first part of the two-part deployment with deploy-release
making the actual deployment.`;

exports.builder = (yargs) => yargs.options({
  target: {
    type: "string", default: "dist/release",
    description: "Target directory root for building the release"
  },
  source: {
    type: "string", default: "packages",
    description: "Relative lerna packages source directory for sourcing the packages"
  },
  overwrite: {
    type: "boolean", default: "false",
    description: "Allow overwriting existing release target build"
  }
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const packageConfig = vlm.packageConfig;
  const releasePath = yargv.target;

  if (!yargv.overwrite && vlm.shell.test("-d", releasePath)) {
    if (packageConfig.version.indexOf("-prerelease") !== -1) {
      vlm.warn("removing an existing '-prerelease' build target:", vlm.colors.path(releasePath));
      vlm.shell.rm("-rf", releasePath);
    } else {
      throw new Error(`build-release: existing build for non-prerelease version ${
        packageConfig.version} found at ${vlm.colors.path(releasePath)}. Bump the version number?`);
    }
  }

  vlm.shell.mkdir("-p", releasePath);

  vlm.info("building version", vlm.colors.version(packageConfig.version), "of",
      vlm.colors.package(packageConfig.name), "into", vlm.colors.path(releasePath));

  return await vlm.invoke(`.release-build/${yargv.toolsetGlob || "**/*"}`,
      [...yargv._, releasePath]);
};

