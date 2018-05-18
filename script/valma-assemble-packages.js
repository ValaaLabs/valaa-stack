#!/usr/bin/env node

const shell = require("shelljs");

const packagesDist = "dist/publish";
shell.rm("-rf", packagesDist);
const valosDist = `${packagesDist}/@valos`;
shell.mkdir("-p", valosDist);

var updatedPackages = shell.exec(`npx -c "lerna updated --json  --loglevel=silent"`);
if (updatedPackages.code) {
  console.log(`No updated packages (or other error with code ${updatedPackages.code})`);
  process.exit();
}
updatedPackages = JSON.parse(updatedPackages);

shell.exec(`npx -c "lerna publish --skip-npm --yes --loglevel=silent"`);

for (var updatedPackage of updatedPackages) {
  var name = updatedPackage.name;
  var targetDirectory = `${packagesDist}/${name}`;
  var subPackage = (name === "valma")
      ? "valma"
      : name.match(/\/([^/]*)/)[1];
  console.log(`\nAssembling package '${name}' into`, targetDirectory, "\n");
  shell.rm("-rf", targetDirectory);
  shell.cp("-R", `packages/${subPackage}`, targetDirectory);
  if (name !== "valma") {
    shell.exec(`babel packages/${subPackage} --out-dir ${targetDirectory}`);
  }
}

/*
// TODO(iridian): This double-increments the version if the lerna.json has cd-version set.
// Fix it so that we can add '--skip-git' to the lerna publish above, so that the version is
// committed to git only if the package assembly is successful.
shell.exec(`npx -c "lerna publish --skip-npm --yes --loglevel=silent --repo-version ${
    updatedPackages[0].version}"`);
*/

/*
// @valos/vault itself
const vaultDirectory = `${valosDist}/vault`;
console.log("\nAssembling package '@valos/vault' into", vaultDirectory, "\n");
shell.rm("-rf", vaultDirectory);
shell.mkdir(vaultDirectory);
shell.cp(`package.json`, vaultDirectory);
shell.cp("-R", `bin`, vaultDirectory);
*/

// @valos primary sub-packages in packages/*
/*
for (var subPackage of ["tools", "raem", "script", "prophet", "engine", "inspire"]) {
  var subPackageDirectory = `${valosDist}/${subPackage}`;
  console.log(`\nAssembling package '@valos/${subPackage}' into`, subPackageDirectory, "\n");
  shell.rm("-rf", subPackageDirectory);
  shell.cp("-R", `packages/${subPackage}`, subPackageDirectory);
  shell.exec(`babel packages/${subPackage} --out-dir ${subPackageDirectory}`);
}
*/
