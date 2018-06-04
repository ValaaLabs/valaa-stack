const path = require("path");
const shell = require("shelljs");

exports.command = "publish-packages [packageglob]";
exports.summary = "publishes all packages that were previously assembled";
exports.describe = `${exports.summary} for publishing by valma-assemble-packages`;

exports.builder = (yargs) => yargs.options({
  source: {
    type: "string", default: "dist/packages",
    description: `source directory for the packages that are to be published. ${
        ""}Each package in this directory will be destroyed after successful publish.`
  }
});

exports.handler = (yargv) => {
  const packageGlob = !yargv.packageglob ? "**" : path.posix.join("**", yargv.packageglob, "**");
  const packagePaths = shell.find(path.posix.join(yargv.source, packageGlob, "package.json"))
      .filter(packageJsonPath => !packageJsonPath.includes("node_modules"))
      .map(packageJsonPath => packageJsonPath.match(/(.*)\/package.json/)[1]);
  for (const packagePath of packagePaths) {
    const publishResult = shell.exec(`npm publish ${packagePath}`);
    if (!publishResult.code && packagePath) {
      shell.rm("-rf", packagePath);
    } else {
      console.log(`valma-publish-packages: 'npm publish ${packagePath}' resulted in error code`,
          publishResult.code, publishResult);
    }
  }
};
