require("shelljs/global");
var path = require("path");

// TODO(iridian): Set the suite up so that config.engine by default refers to appropriately installed node_modules/<valaaEngine>
// FIXME(iridian): While implementing above, something is still broken: webpack creates an empty valaa.min.js

var synopsis = "run-with-local-engine engine_path";

if (typeof process.argv[2] === "undefined") {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var enginePath = process.argv[2];
var enginePackageJsonPath = path.join(enginePath, "package.json");

var packageJson = JSON.parse(cat("package.json"));

if (!test("-f", enginePackageJsonPath)) {
  echo();
  console.error("ERROR: Cannot open engine configuration '" + enginePackageJsonPath +
      "' for reading.\n\nNote! If this the first time you're running this project locally, " +
      "you can override the package.json:config.engine of this project with a global npm config setting: \n" +
      "  npm config set " + packageJson.name + ":engine <valaaEnginePath>" +
      "Of course, you'll need to have a local valaa engine project fetched at <valaaEnginePath>.");
  exit(-1);
}

var enginePackageJson = JSON.parse(cat(enginePackageJsonPath));
if (!enginePackageJson || typeof enginePackageJson !== "object") {
  echo();
  console.error("ERROR: Cannot parse engine configuration '" +
      enginePackageJsonPath + "' as non-null JSON, got: ``", enginePackageJson, "''");
  exit(-1);
}
if (!enginePackageJson.valaa) {
  echo();
  console.error("ERROR: '" + enginePackageJsonPath + "' missing 'valaa' section");
  exit(-1);
}
if (enginePackageJson.valaa.type !== "engine") {
  echo();
  console.error("ERROR: '" + enginePackageJsonPath + "'.valaa.type is not an 'engine'," +
      " got '" + enginePackageJson.valaa.type + "'");
  exit(-1);
}

var engineName = enginePackageJson.name;
var thisProjectPath = String(pwd());

cd(enginePath);
if (packageJson.config.engine !== enginePath) {
  console.log("\Note! Running with a CUSTOM engine '" + enginePath +
      "' sourced from the global npm config variable " + packageJson.name + ":engine\n");
} else {
  console.log("\nRunning with the package.json:config.engine '" + enginePath + "'\n");
}
exec("npm run dev " + thisProjectPath);
