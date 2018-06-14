#!/usr/bin/env vlm

exports.command = "package-assemble";
exports.summary = "Assemble all current modified vault packages (preparing for publish)";
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

'sudo vlm package-assemble --skip-versioning --overwrite --link --post="chown -R $USER.$USER *"'

the packages can be iteratively tested and developed locally even with other
packages depending on and being tested against them. To have other packages
depend on such an assembled, iteratively developed package the dependency must
be then manually added by running following command in the depending package:

'npm link <assembled-package-name>'

After the initial run the packages can be updated without 'sudo' with

'vlm package-assemble --skip-versioning --overwrite'

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
    type: "string", default: "package-assemble",
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
  const vlm = yargv.vlm;
  const publishDist = yargv.target;
  vlm.shell.mkdir("-p", publishDist);
  if (!yargv.overwrite && vlm.shell.ls("-lA", publishDist).length) {
    console.error(`valma-package-assemble: target directory '${publishDist}' is not empty`);
    process.exit(-1);
  }

  let updatedPackageNames;
  if (!yargv.force) {
    const updatedPackages = vlm.shell.exec(`npx -c "lerna updated --json  --loglevel=silent"`);
    if (updatedPackages.code) {
      console.log(`valma-package-assemble: no updated packages found (or other lerna error, code ${
          updatedPackages.code})`);
      return;
    }
    updatedPackageNames = JSON.parse(updatedPackages).map(entry => entry.name);
  }
  const sourcePackageJSONPaths = vlm.shell.find("-l",
      vlm.path.join(yargv.source, "*/package.json"));
  const successfulPackages = [];

  const assemblePackages = sourcePackageJSONPaths.map(sourcePackageJSONPath => {
    const sourceDirectory = sourcePackageJSONPath.match(/^(.*)package.json$/)[1];
    const packagePath = vlm.path.join(process.cwd(), sourceDirectory, "package.json");
    // eslint-disable-next-line import/no-dynamic-require
    const packageConfig = require(packagePath);
    const name = packageConfig.name;
    if (updatedPackageNames && !updatedPackageNames.includes(name)) return undefined;
    if (packageConfig.private) {
      console.log(`\nvalma-package-assemble: skipping private package '${name}'`);
      return undefined;
    }
    const targetDirectory = vlm.path.join(publishDist, name);
    return {
      name, sourceDirectory, packagePath, packageConfig, targetDirectory, sourcePackageJSONPath,
    };
  }).filter(p => p);

  const finalizers = assemblePackages.map(({
    name, sourceDirectory, packagePath, packageConfig, targetDirectory, sourcePackageJSONPath,
  }) => {
    console.log(`\nvalma-package-assemble: assembling package '${name}' into`, targetDirectory);
    vlm.shell.mkdir("-p", targetDirectory);
    vlm.shell.cp("-R", vlm.path.join(sourceDirectory, "*"), targetDirectory);
    if (vlm.shell.test("-f", vlm.path.join(sourceDirectory, ".babelrc"))
        || vlm.shell.test("-f", vlm.path.join(sourceDirectory, ".babelrc.js"))
        || vlm.shell.test("-f", vlm.path.join(sourceDirectory, "babel.config.js"))) {
      vlm.shell.exec(
          `NODE_ENV=${yargv.nodeEnv} babel ${sourceDirectory} --out-dir ${targetDirectory}`);
    }
    if (yargv.unlink) {
      console.log(`\nvalma-package-assemble: 'npm unlink' for package '${name}' (in '${
          targetDirectory}')`);
      vlm.shell.exec(`cd ${targetDirectory} && npm unlink`);
    }
    successfulPackages.push({ packageConfig, packagePath });
    return { sourcePath: sourcePackageJSONPath, targetPath: targetDirectory };
  }).filter(finalizer => finalizer);

  console.log("valma-package-assemble: no catastrophic errors found during assembly");

  const noUpdate = yargv.skipVersioning;
  if (noUpdate) {
    console.log("valma-package-assemble: --skip-versioning requested:",
        "no version update, no git commit, no git tag, no package.json finalizer copying");
  } else {
    console.log("valma-package-assemble: no errors found during assembly:",
        "updating version, making git commit and creating lerna git tag");
    const forceFlags = yargv.force ? "--force-publish=*" : "";
    vlm.shell.exec(`npx -c "lerna publish --skip-npm --yes --loglevel=silent ${forceFlags}"`);
    console.log("valma-package-assemble:",
        "finalizing assembled packages with version-updated package.json's");
    [].concat(...finalizers).forEach((operation) => {
      vlm.shell.cp(operation.sourcePath, operation.targetPath);
    });
  }

  if (yargv.link) {
    assemblePackages.forEach(({ name, targetDirectory }) => {
      console.log(`\nvalma-package-assemble: 'npm link' for package '${name}' (in '${
        targetDirectory}')`);
      vlm.shell.exec(`cd ${targetDirectory} && npm link`);
    });
  }

  if (yargv.post) {
    assemblePackages.forEach(({ name, targetDirectory }) => {
      console.log(`\nvalma-package-assemble: '${yargv.post}' for package '${name}' (in '${
        targetDirectory}')`);
      vlm.shell.exec(`cd ${targetDirectory} && ${yargv.post}`);
    });
  }

  const align = successfulPackages.reduce((acc, { packageConfig }) =>
      ((acc > packageConfig.name.length) ? acc : packageConfig.name.length), 0);

  console.log("valma-package-assemble: successfully",
      noUpdate ? "reassembled" : "assembled", finalizers.length, "packages",
          ...(updatedPackageNames
              ? ["(out of", updatedPackageNames.length, "marked as updated):"]
              : ["(from all --force selected packages)"]));
  successfulPackages.forEach(({ packageConfig, packagePath }) => {
    const updatedConfig = JSON.parse(vlm.shell.head({ "-n": 1000000 }, packagePath));
    const versionChange = noUpdate && (updatedConfig.version === packageConfig.version)
            ? `kept at ${packageConfig.version}`
        : !noUpdate ? `updated to ${updatedConfig.version} from ${packageConfig.version}`
        : `unexpectedly updated to ${updatedConfig.version} from ${packageConfig.version}`;
    console.log(`\t${updatedConfig.name}${" ".repeat(align - updatedConfig.name.length)}:`,
        versionChange);
  });
};
