const path = require("path");
const shell = require("shelljs");

exports.command = "assemble-packages";
exports.summary = "assembles all current modified vault packages (preparing for publish)";
exports.describe = `${exports.summary} into a temporary dist target`;


exports.builder = (yargs) => yargs.options({
  target: {
    type: "string", default: "dist/publish",
    description: "target directory for building the packages (must be empty or not exist)"
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
  const publishDist = yargv.target;
  shell.mkdir("-p", publishDist);
  if (shell.ls("-lA", publishDist).length) {
    console.error(`valma-assemble-packages: target directory '${publishDist}' is not empty`);
    process.exit(-1);
  }

  let updatedPackages = shell.exec(`npx -c "lerna updated --json  --loglevel=silent"`);
  if (updatedPackages.code) {
    console.log(`valma-assemble-packages: no updated packages found (or other lerna error, code ${
        updatedPackages.code})`);
    return;
  }
  updatedPackages = JSON.parse(updatedPackages);
  const sourcePackageJSONPaths = shell.find("-l", path.posix.join(yargv.source, "*/package.json"));

  const finalizers = sourcePackageJSONPaths.map(sourcePackageJSONPath => {
    const sourceDirectory = sourcePackageJSONPath.match(/^(.*)package.json$/)[1];
    // eslint-disable-next-line import/no-dynamic-require
    const packageConfig = require(path.posix.join(process.cwd(), sourceDirectory, "package.json"));
    const name = packageConfig.name;
    if (!updatedPackages.find((candidate) => (candidate.name === name))) return undefined;
    if (packageConfig.private) {
      console.log(`\nvalma-assemble-packages: skipping private package '${name}'`);
      return undefined;
    }
    const targetDirectory = path.posix.join(publishDist, name);
    console.log(`\nvalma-assemble-packages: assembling package '${name}' into`, targetDirectory);
    shell.mkdir("-p", targetDirectory);
    shell.cp("-R", path.posix.join(sourceDirectory, "*"), targetDirectory);
    if (shell.test("-f", path.posix.join(sourceDirectory, ".babelrc"))) {
      shell.exec(`NODE_ENV=${yargv.nodeEnv} babel ${sourceDirectory} --out-dir ${targetDirectory}`);
    }
    return { sourcePath: sourcePackageJSONPath, targetPath: targetDirectory };
  }).filter(finalizer => finalizer);

  console.log("valma-assemble-packages: no errors found during assembly:",
      "updating version, making git commit and creating lerna git tag");
  shell.exec(`npx -c "lerna publish --skip-npm --yes --loglevel=silent"`);

  console.log("valma-assemble-packages:",
      "finalizing assembled packages with version-updated package.json's");
  [].concat(...finalizers).forEach((operation) => {
    shell.cp(operation.sourcePath, operation.targetPath);
  });
  console.log("valma-assemble-packages: successfully assembled", finalizers.length,
      "packages (out of", updatedPackages.length, "marked as updated)");
};
