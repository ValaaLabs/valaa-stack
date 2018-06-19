#!/usr/bin/env vlm

exports.command = "package-publish [packageglob]";
exports.summary = "Publish previously assembled packages to their registries";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs.options({
  source: {
    type: "string", default: "dist/packages",
    description: `source directory for the packages that are to be published. ${
        ""}Each package in this directory will be deleted after successful publish.`
  }
});

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const packageGlob = !yargv.packageglob ? "**" : vlm.path.join("**", yargv.packageglob, "**");
  const packagePaths = vlm.shell.find(vlm.path.join(yargv.source, packageGlob, "package.json"))
      .filter(packageJsonPath => !packageJsonPath.includes("node_modules"))
      .map(packageJsonPath => packageJsonPath.match(/(.*)\/package.json/)[1]);
  for (const packagePath of packagePaths) {
    const publishResult = vlm.shell.exec(`npm publish ${packagePath}`);
    if (!publishResult.code && packagePath) {
      vlm.shell.rm("-rf", packagePath);
    } else {
      console.log(`valma-package-publish: 'npm publish ${packagePath}' resulted in error code`,
          publishResult.code, publishResult);
    }
  }
};
