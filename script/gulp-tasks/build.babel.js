import cp from "child_process";
import directoryExists from "directory-exists";
import env from "./helper/env.babel";

/*
  What this actually should do is:
  -> figure out which version to build (env var, param?)
  -> export the tag from git to a build directory
  -> run the actual build steps on that version of the code

  for now this isn't doing that to stay compatible with the original
  builds, without the effort of maintaining that one

  @todo Peter clean this up once the old style builds aren't needed anymore
 */

module.exports = (cb, plugins) => {
  console.log(` -> checking if build dir for ${env().version} already exists`);

  if (directoryExists.sync(`dist/import/inspire-engine.${env().version}`)) {
    console.log(` !> directory dist/import/inspire-engine.${env().version} already exists, skipping build`);
    return cb();
  }

  console.log(` -> triggering build for version ${env().version}\n    NOTE: this will just run the same command as previous builds for now, which should be cleaned up once the dev builds have moved to s3 too`);
  console.log("\n");

  const command = `cross-conf-env node script/export-valaa-engine inspire-engine.${env().version}`;

  cp.exec(command, function (err, stdout, stderr) {
    if (err) return cb(stderr);
    console.log(stdout);
    return cb();
  });
};
