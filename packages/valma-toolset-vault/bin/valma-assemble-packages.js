const path = require("path");
const shell = require("shelljs");

exports.command = "assemble-packages";
exports.summary = "assembles all current modified vault packages (preparing for publish)";
exports.describe = `${exports.summary} into a temporary dist target.

Uses lerna to handle the monorepo sub-packages update detection, versioning,
and git interactions. Configuration for lerna is in lerna.json:
notably the version increase semantics is configured there.

Lerna is not used for constructing the actual packages. This is done by a
flat recursive cp to the target at the moment.

Invokes babel for all projects with '.babelrc' in their root. If the vault
has a shared .babelrc for all packages, a symlink from this root to each
project should be created.

When assembling lerna will automatically update the shared version for all
packages and their cross-dependencies and make a git commit and git tag for
the new version. This behaviour can be omitted with --skip-versioning.

  Iterative development with --link:

Using the command

'sudo vlm assemble-packages --skip-versioning --overwrite --link --post="chown -R $USER.$USER *"'

the packages can be iteratively tested and developed locally even with other
packages depending on and being tested against them. To have other packages
depend on such an assembled, iteratively developed package the dependency must
be then manually added by running following command in the depending package:

'npm link <assembled-package-name>'

After the initial run the packages can be updated without 'sudo' with

'vlm assemble-packages --skip-versioning --overwrite'

as long as no new files have been added (re-run the full command in that case).

Note: the --post options is used to reset the ownership back to original user
as as 'sudo npm link' uses hard links.
Read more about npm link: https://docs.npmjs.com/cli/link .
`;


exports.builder = (yargs) => yargs.options({
  target: {
    type: "string", default: "dist/packages",
    description: "Target directory for building the packages (must be empty or not exist)"
  },
  source: {
    type: "string", default: "packages",
    description: "Source packages directory. Must match one lerna.json entry."
  },
  "node-env": {
    type: "string", default: "assemble-packages",
    description: "NODE_ENV environment variable for the babel builds"
        + " (used for packages with .babelrc defined)"
  },
  force: {
    type: "boolean", default: false,
    description: "Build packages even if they have not been updated"
  },
  overwrite: {
    type: "boolean", default: false,
    description: "Allow overwriting existing packages in the target directory"
  },
  "skip-versioning": {
    type: "boolean", default: false,
    description: "Skip bumping the version, making a git tag and making a git commit"
  },
  link: {
    type: "boolean", default: false,
    description: "Run 'npm link' for each assembled package"
  },
  unlink: {
    type: "boolean", default: false, implies: ["overwrite", "skip-versioning"],
    description: "Run 'npm unlink' for each assembled package"
  },
  post: {
    type: "string",
    description: "Run a command for each assembled package after the assembly is done",
  }
});

exports.handler = async (yargv) => {
  const publishDist = yargv.target;
  shell.mkdir("-p", publishDist);
  if (!yargv.overwrite && shell.ls("-lA", publishDist).length) {
    console.error(`valma-assemble-packages: target directory '${publishDist}' is not empty`);
    process.exit(-1);
  }

  let updatedPackageNames;
  if (!yargv.force) {
    const updatedPackages = shell.exec(`npx -c "lerna updated --json  --loglevel=silent"`);
    if (updatedPackages.code) {
      console.log(`valma-assemble-packages: no updated packages found (or other lerna error, code ${
          updatedPackages.code})`);
      return;
    }
    updatedPackageNames = JSON.parse(updatedPackages).map(entry => entry.name);
  }
  const sourcePackageJSONPaths = shell.find("-l", path.posix.join(yargv.source, "*/package.json"));
  const successfulPackages = [];

  const assemblePackages = sourcePackageJSONPaths.map(sourcePackageJSONPath => {
    const sourceDirectory = sourcePackageJSONPath.match(/^(.*)package.json$/)[1];
    const packagePath = path.posix.join(process.cwd(), sourceDirectory, "package.json");
    // eslint-disable-next-line import/no-dynamic-require
    const packageConfig = require(packagePath);
    const name = packageConfig.name;
    if (updatedPackageNames && !updatedPackageNames.includes(name)) return undefined;
    if (packageConfig.private) {
      console.log(`\nvalma-assemble-packages: skipping private package '${name}'`);
      return undefined;
    }
    const targetDirectory = path.posix.join(publishDist, name);
    return {
      name, sourceDirectory, packagePath, packageConfig, targetDirectory, sourcePackageJSONPath,
    };
  }).filter(p => p);

  const finalizers = assemblePackages.map(({
    name, sourceDirectory, packagePath, packageConfig, targetDirectory, sourcePackageJSONPath,
  }) => {
    console.log(`\nvalma-assemble-packages: assembling package '${name}' into`, targetDirectory);
    shell.mkdir("-p", targetDirectory);
    shell.cp("-R", path.posix.join(sourceDirectory, "*"), targetDirectory);
    if (shell.test("-f", path.posix.join(sourceDirectory, ".babelrc"))
        || shell.test("-f", path.posix.join(sourceDirectory, ".babelrc.js"))
        || shell.test("-f", path.posix.join(sourceDirectory, "babel.config.js"))) {
      shell.exec(`NODE_ENV=${yargv.nodeEnv} babel ${sourceDirectory} --out-dir ${targetDirectory}`);
    }
    if (yargv.unlink) {
      console.log(`\nvalma-assemble-packages: 'npm unlink' for package '${name}' (in '${
          targetDirectory}')`);
      shell.exec(`cd ${targetDirectory} && npm unlink`);
    }
    successfulPackages.push({ packageConfig, packagePath });
    return { sourcePath: sourcePackageJSONPath, targetPath: targetDirectory };
  }).filter(finalizer => finalizer);

  console.log("valma-assemble-packages: no catastrophic errors found during assembly");

  const noUpdate = yargv.skipVersioning;
  if (noUpdate) {
    console.log("valma-assemble-packages: --skip-versioning requested:",
        "no version update, no git commit, no git tag, no package.json finalizer copying");
  } else {
    console.log("valma-assemble-packages: no errors found during assembly:",
        "updating version, making git commit and creating lerna git tag");
    const forceFlags = yargv.force ? "--force-publish=*" : "";
    shell.exec(`npx -c "lerna publish --skip-npm --yes --loglevel=silent ${forceFlags}"`);
    console.log("valma-assemble-packages:",
        "finalizing assembled packages with version-updated package.json's");
    [].concat(...finalizers).forEach((operation) => {
      shell.cp(operation.sourcePath, operation.targetPath);
    });
  }

  if (yargv.link) {
    assemblePackages.forEach(({ name, targetDirectory }) => {
      console.log(`\nvalma-assemble-packages: 'npm link' for package '${name}' (in '${
        targetDirectory}')`);
      shell.exec(`cd ${targetDirectory} && npm link`);
    });
  }

  if (yargv.post) {
    assemblePackages.forEach(({ name, targetDirectory }) => {
      console.log(`\nvalma-assemble-packages: '${yargv.post}' for package '${name}' (in '${
        targetDirectory}')`);
      shell.exec(`cd ${targetDirectory} && ${yargv.post}`);
    });
  }

  const align = successfulPackages.reduce((acc, { packageConfig }) =>
      ((acc > packageConfig.name.length) ? acc : packageConfig.name.length), 0);

  console.log("valma-assemble-packages: successfully",
      noUpdate ? "reassembled" : "assembled", finalizers.length, "packages",
          ...(updatedPackageNames
              ? ["(out of", updatedPackageNames.length, "marked as updated):"]
              : ["(from all --force selected packages)"]));
  successfulPackages.forEach(({ packageConfig, packagePath }) => {
    const updatedConfig = JSON.parse(shell.head({ "-n": 1000000 }, packagePath));
    const versionChange = noUpdate && (updatedConfig.version === packageConfig.version)
            ? `kept at ${packageConfig.version}`
        : !noUpdate ? `updated to ${updatedConfig.version} from ${packageConfig.version}`
        : `unexpectedly updated to ${updatedConfig.version} from ${packageConfig.version}`;
    console.log(`\t${updatedConfig.name}${" ".repeat(align - updatedConfig.name.length)}:`,
        versionChange);
  });
};
