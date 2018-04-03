require("shelljs/global");
var path = require("path");
var _ = require("lodash");
var beautify = require("js-beautify").js_beautify;

// FIXME(iridian): Fix *nix dependencies like rmdir.
// FIXME(iridian): Fix assumed availability of tar/gz.

var synopsis = "export isRepackage [valaaJsonOverrides]";

if (typeof process.argv[2] === "undefined") {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var isRepackage = process.argv[2];
var valaaJsonOverrides = process.argv[3] ? JSON.parse(process.argv[3]) : {};


var sourceDirectory = "dist";

if (!test("-d", sourceDirectory)) {
  echo();
  console.error("ERROR: project 'dist' doesn't exist");
  exit(-1);
}
var packageJson = JSON.parse(cat("package.json"));
if (!packageJson || typeof packageJson !== "object") {
  echo();
  console.error("ERROR: Cannot parse", sourceValaaPath, "as non-null json object: got",
      packageJson);
  exit(-1);
}
if (!packageJson.valaa) {
  echo();
  console.error("ERROR: '" + sourceValaaPath + "' missing 'valaa' section");
  exit(-1);
}
if (!packageJson.valaa.engine) {
  echo();
  console.error("ERROR: '" + sourceValaaPath + "' missing 'valaa.engine' section");
  exit(-1);
}

var projectName = packageJson.name;
var projectVersion = packageJson.version;
var packageName = projectName + "." + projectVersion;
var targetDirectory = projectName && projectVersion && path.join("temp", packageName);
var engineName = packageJson.valaa.engine.name;
var engineVersion = packageJson.valaa.engine.version;

if (!projectName) {
  echo();
  console.error("ERROR: projectName missing");
}
if (!projectVersion) {
  echo();
  console.error("ERROR: projectVersion missing");
}
if (!engineName) {
  echo();
  console.error("ERROR: engineName missing");
}
if (!engineVersion) {
  echo();
  console.error("ERROR: engineVersion missing");
}
if (!projectName || !projectVersion || !engineName || !engineVersion) exit(-1);

if (isRepackage) {
  echo("Repackaging: removing '" + targetDirectory + "' and '" + packageName + ".tar.gz'");
  exec("rm -rf", targetDirectory);
  exec("rm " + packageName + ".tar.gz");
} else if (test("-d", targetDirectory)) {
  exec("rmdir " + targetDirectory);
  if (test("-d", targetDirectory)) {
    echo();
    console.error("ERROR: target directory", targetDirectory,
        "already exists and could not be cleared. Is this version (" + projectVersion
            + ") already exported?");
    exit(-1);
  }
}

echo();
console.log("Converting to a Valaa -importable package from", sourceDirectory, "to",
    targetDirectory, "using engine", engineName + "." + engineVersion,
    ", with following valaa.json overrides:", beautify(JSON.stringify(valaaJsonOverrides)));
echo();

mkdir("-p", targetDirectory);

var valaaJson = _.pick(packageJson,
    ["name", "version", "description", "author", "license", "private", "valaa"]);

_.merge(valaaJson, valaaJsonOverrides);
if (Object.keys(valaaJson).length !== 7) {
  console.error("ERROR: Invalid package.json; missing or extra fields, of the required " +
      "'name', 'version', 'description', 'author', 'license', 'private' and 'valaa', got ",
      Object.keys(valaaJson).length, " fields:", Object.keys(valaaJson), beaumpify(valaaJson));
  exit(-1);
}

valaaJson = beautify(JSON.stringify(valaaJson));
echo("Setting", targetDirectory + "/valaa.json contents to:", valaaJson);
ShellString(valaaJson).to(targetDirectory + "/valaa.json");

echo("Copying", sourceDirectory + "/* to", targetDirectory);
cp("-R", sourceDirectory + "/*", targetDirectory);

cd("temp");
exec("tar czf ../" + packageName + ".tar.gz " + packageName);
echo("Created " + packageName + ".tar.gz ready for Valaa import");
