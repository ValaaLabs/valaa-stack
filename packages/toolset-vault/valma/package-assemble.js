#!/usr/bin/env vlm

exports.command = "package-assemble";
exports.summary = "Assemble all current modified vault packages (preparing for publish)";
exports.describe = `${exports.summary}.

Uses lerna to handle the monorepo sub-packages update detection, versioning,
and git interactions. Configuration for lerna is in lerna.json:
notably the version increase semantics is configured there.

Lerna is not used for constructing the actual packages. This is done by a
flat recursive cp to the target at the moment.

Invokes babel for all projects with babel.config.js in their root. If the
vault has a shared babel.config.js for all packages, a symlink from this
root to each project should be created.

When assembling lerna will automatically update the shared version for all
packages and their cross-dependencies and make a git commit and git tag for
the new version. This behaviour can be omitted with --no-versioning.

  Iterative development with --link:

Using the command

'sudo vlm package-assemble --no-versioning --overwrite --post="chown -R $USER.$USER *"'

the packages can be iteratively tested and developed locally even with other
packages depending on and being tested against them. To have other packages
depend on such an assembled, iteratively developed package the dependency must
be then manually added by running following command in the depending package:

'npm link <assembled-package-name>'

After the initial run the packages can be updated without 'sudo' with

'vlm package-assemble --no-versioning --overwrite'

as long as no new files have been added (re-run the full command in that case).

Note: the --post options is used to reset the ownership back to original user
as as 'sudo npm link' uses hard links.
Read more about npm link: https://docs.npmjs.com/cli/link .`;


exports.builder = (yargs) => yargs.options({
  target: {
    type: "string", default: "dist/packages",
    description: "Target directory for building the packages (must be empty or not exist)",
  },
  source: {
    type: "string", default: "packages",
    description: "Source packages directory. Must match one lerna.json entry.",
  },
  "babel-target-env": {
    type: "string", default: "package-assemble",
    description: "TARGET_ENV environment variable for the babel builds"
        + " (used for packages with babel configuration in their root)",
  },
  overwrite: {
    type: "boolean", default: false,
    description: "Allow overwriting existing builds in the target directory",
  },
  "only-pending": {
    type: "boolean", default: false,
    description: `Limit the selection to packages currently existing in the target directory.${
        ""} Causes --overwrite`,
    causes: ["overwrite"],
  },
  "only-changed": {
    type: "boolean", default: true,
    description: "Limit the selection to packages with changes.",
  },
  versioning: {
    type: "boolean", default: true,
    description: "Bump the version, make a git commit and a git tag with lerna",
  },
  assemble: {
    type: "boolean", default: true,
    description: "Actually copy and transpile files to the target",
  },
  reassemble: {
    type: "boolean", default: false,
    description: `Reassembles packages pending publication. Causes --overwrite --pending.`,
    causes: ["overwrite"],
  },
  "post-execute": {
    type: "string",
    description: "The command to execute inside each built package after the assembly",
  },
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm.tailor({ toolName: "package-assemble" });
  const publishDist = yargv.target;
  vlm.shell.mkdir("-p", publishDist);
  const targetListing = vlm.shell.ls("-lA", publishDist);
  if (!yargv.overwrite && targetListing.length) {
    vlm.warn(`Target directory '${publishDist}' is not empty:`,
        targetListing.filter(f => f).map(f => f.name));
  }

  let requestGlobs = yargv._.length >= 1 ? ["**/*"] : yargv._.slice(1);
  let updatedPackageNames;
  vlm.info("Selecting packages matching:", ...requestGlobs);
  if (yargv.onlyChanged) {
    vlm.info("Limiting selection to only changed packages");
    const updatedPackages = vlm.shell.exec(`npx -c "lerna updated --json --loglevel=silent"`);
    if (updatedPackages.code) {
      vlm.warning("No updated packages found, exiting",
          `(or lerna error with code ${updatedPackages.code}`);
      return;
    }
    updatedPackageNames = JSON.parse(updatedPackages).map(p => p.name);
  }
  const sourcePackageJSONPaths = vlm.shell.find("-l",
      vlm.path.join(yargv.source, "*/package.json"));

  let selections = sourcePackageJSONPaths.map(sourcePackageJSONPath => {
    const sourceDirectory = sourcePackageJSONPath.match(/^(.*)package.json$/)[1];
    const packagePath = vlm.path.join(process.cwd(), sourceDirectory, "package.json");
    // eslint-disable-next-line import/no-dynamic-require
    const packageConfig = require(packagePath);
    const name = packageConfig.name;
    const targetDirectory = vlm.path.join(publishDist, name);
    const ret = {
      name, sourceDirectory, packagePath, packageConfig, targetDirectory, sourcePackageJSONPath,
    };
    if (yargv.onlyChanged && !updatedPackageNames.includes(name)) return undefined;
    if (!requestGlobs.find(glob => vlm.minimatch(name, glob))) return undefined;
    if (vlm.shell.test("-d", targetDirectory)) {
      ret.exists = true;
    } else if (yargv.onlyPending) return undefined;
    if (packageConfig.private) {
      vlm.warning(`Skipping private package '${name}'`);
      ret.failure = "private package";
    }
    return ret;
  });
  {
    const orderedSelections = [];
    requestGlobs.forEach(glob => orderedSelections.push(...selections.filter(
        entry => entry && !orderedSelections.includes(entry) && vlm.minimatch(entry.name, glob))));
    selections = orderedSelections;
  }
  vlm.info("Selected packages:", ...selections.map(({ name }) => name))

  if (!yargv.assemble) {
    vlm.info(`--no-assemble requested`, "skipping the assembly of", selections.length, "packages");
  } else {
    selections.forEach(selection => {
      if (selection.failure) return;
      if (selection.exists && !yargv.overwrite) {
        vlm.error(`Cannot assemble package '${name}'`,
            `an existing assembly exists at '${targetDirectory}' and no --overwrite is specified)`);
        selection.failure = "pending assembly found";
        return;
      }
      const {
        name, sourceDirectory, packagePath, packageConfig, targetDirectory, sourcePackageJSONPath,
      } = selection;

      vlm.info(`Assembling package '${name}'`, "into", targetDirectory);
      vlm.shell.mkdir("-p", targetDirectory);
      vlm.shell.cp("-R", vlm.path.join(sourceDirectory, "*"), targetDirectory);
      vlm.shell.rm("-rf", vlm.path.join(targetDirectory, "node_modules"));
      if (vlm.shell.test("-f", vlm.path.join(sourceDirectory, "babel.config.js"))) {
        const result = vlm.shell.exec(
            `TARGET_ENV=${yargv.babelTargetEnv} babel ${sourceDirectory} --out-dir ${
                targetDirectory}`);
        if (!String(result).match(/Successfully compiled/)) {
          selection.failure = "babel transpilation not successful";
          vlm.error(`${selection.failure} for ${name}`);
          return;
        }
      }
      selection.assembled = true;
    });
    vlm.info("No catastrophic errors during assembly");
  }

  if (!yargv.versioning) {
    vlm.info("--no-versioning requested:",
        "no version update, no git commit, no git tag, no package.json finalizer copying");
  } else {
    vlm.info("Updating version, making git commit, creating a lerna git tag and",
        "updating target package.json's");
    await vlm.execute("lerna", [
      "publish", "--skip-npm", "--yes", "--loglevel=silent", yargv.force && "--force-publish=*"
    ]);
    if (!yargv.assemble && (!yargv.overwrite || !yargv.onlyPending)) {
      vlm.info("Skipping package.json version updates", "as",
          yargv.assemble ? "--no-assemble"
          : !yargv.overwrite ? "--no-overwrite" : "--no-only-pending", "was specified");
    } else {
      vlm.info("Updating version-updated package.json to assembled packages");
      selections.forEach(({ name, sourcePackageJSONPath, targetDirectory, assembled }) => {
        if (!sourcePackageJSONPath) return;
        if (assembled || (!yargv.assemble && yargv.overwrite && yargv.onlyPending)) {
          vlm.shell.cp(sourcePackageJSONPath, targetDirectory);
          return;
        }
        if (!yargv.overwrite || !yargv.onlyPending || yargv.assemble) {
          vlm.warn(`Skipped copying updated '${name}' package.json to non-assembled package as`,
              ...(yargv.assemble ? ["--assemble"] : []),
              ...(!yargv.overwrite ? ["--no-overwrite"] : []),
              ...(!yargv.onlyPending ? ["--no-only-pending"] : []), "was specified");
        }
      });
    }
  }

  if (yargv.postExecute) {
    selections.forEach(({ name, targetDirectory, assembled }) => {
      if (!assembled && yargv.assemble) {
        vlm.info(`Skipping post-execute '${yargv.postExecute}' for '${name}'`,
            `assembly was requested but not successful for this package`);
      } else {
        vlm.info(`post-execute '${yargv.postExecute}' for '${name}'`, `(in '${targetDirectory}')`);
        vlm.shell.exec(`cd ${targetDirectory} && ${yargv.postExecute}`);
      }
    });
  }

  const align = selections.reduce((acc, { name }) => ((acc > name.length) ? acc : name.length), 0);
  let successes = 0;
  selections.forEach(({ name, packageConfig, packagePath, failure }) => {
    const newConfig = JSON.parse(vlm.shell.head({ "-n": 1000000 }, packagePath));
    if (!failure) ++successes;
    const header = `\t${name}${" ".repeat(align - name.length)}:`;
    const conclusion = failure ? `failed: ${failure}`
        : newConfig.version === packageConfig.version
            ? `success: version kept at ${packageConfig.version}`
        : yargv.versioning
            ? `success: version updated to ${newConfig.version} from ${packageConfig.version}`
        : `success: surprise version update to ${newConfig.version} from ${packageConfig.version}`;
    if (failure) vlm.error(header, conclusion);
    else vlm.info(header, conclusion);
  });
  if (successes === selections.length) {
    vlm.info(`Successfully assembled all packages`, "(of", selections.length, "selected packages)");
  } else {
    vlm.error(`Assembled only ${successes} out of ${selections.length} selected packages`);
  }
};
