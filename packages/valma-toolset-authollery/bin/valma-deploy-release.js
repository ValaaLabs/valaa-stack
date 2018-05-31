const shell = require("shelljs");
const path = require("path");

exports.command = "deploy-release [moduleglob]";
exports.summary = "deploys the prepared releases to their corresponding backends";
exports.describe = `${exports.summary}`;

exports.builder = (yargs) => yargs.options({
  source: {
    type: "string", default: "dist/deploy",
    description: `source directory for the releases that are to be deployed. ${
        ""}Each release in this directory will be removed after a successful deployment.`,
  },
  prerelease: {
    type: "boolean", default: false,
    description: "allow prerelease deployments",
  }
});

exports.handler = (yargv) => {
  const packageConfig = yargv.vlm.packageConfig;
  const packageName = packageConfig.name.replace(/\//g, "_");

  const releaseDist = path.posix.join(yargv.source, `${packageName}-${packageConfig.version}`);

  if (!yargv.prerelease && (packageConfig.version.indexOf("-prerelease") !== -1)) {
    throw new Error(`valma-deploy-release: cannot deploy a release with a '-prerelease' version${
        ""} (provide '--prerelease' option to override).`);
  }

  if (!shell.test("-d", releaseDist)) {
    throw new Error(`valma-deploy-release: cannot find a release build for version '${
        packageConfig.version}' version in "${releaseDist}".`);
  }
  console.log("\nvalma-deploy-release: deploying", packageConfig.name, packageConfig.version,
      "from", releaseDist);

  return yargv.vlm.callValma(".deploy-release/**/*", releaseDist);
};
