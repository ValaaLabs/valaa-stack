const path = require("path");
const shell = require("shelljs");

exports.command = "build-release";
exports.summary = "builds all modified authollery components (preparing for deploy)";
exports.describe = `${exports.summary} into a temporary dist target`;

exports.builder = (yargs) => yargs.options({
  target: {
    type: "string", default: "dist/publish",
    description: "target directory root for building the release"
  },
  source: {
    type: "string", default: "packages",
    description: "relative lerna packages source directory for sourcing the packages"
  },
  "node-env": {
    type: "string", default: "assemble-packages",
    description: "NODE_ENV environment variable for the babel builds"
        + " (used for packages with .babelrc defined)"
  }
});

exports.handler = (yargv) => {
  const packageConfig = yargv.vlm.packageConfig;
  const packageName = packageConfig.name.replace(/\//g, "-");

  const releaseDist = path.posix.join(yargv.target, `${packageName}-${packageConfig.version}`);
  if (shell.test("-d", releaseDist)) {
    if (packageConfig.version.indexOf("-prerelease") !== -1) {
      console.warn("valma-build-release: removing an existing '-prerelease' build target:",
          releaseDist);
      shell.rm("-rf", releaseDist);
    } else {
      throw new Error(`valma-build-release: existing build for non-prerelease version ${
        packageConfig.version} found at ${releaseDist}. Bump the version number?`);
    }
  }

  shell.mkdir("-p", releaseDist);

  console.log("valma-build-release: building version", packageConfig.version, "of",
      packageConfig.name, "into", releaseDist);

  return yargv.vlm.callValma(".build-release/**/*", releaseDist);
};
