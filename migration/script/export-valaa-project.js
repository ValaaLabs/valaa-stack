require("shelljs/global");
var path = require("path");
var _ = require("lodash");
var beautify = require("js-beautify").js_beautify;

var synopsis = "export-valaa-project projectPath [valaaJsonOverrides]";

if (!process.argv[2]) {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var sourceDirectory = process.argv[2];
if (!test("-d", sourceDirectory)) {
  echo();
  console.error("ERROR: project source directory '" + sourceDirectory + "' doesn't exist");
  exit(-1);
}
var sourceValaaPath = path.join(sourceDirectory, "valaa.json");
if (!test("-f", sourceValaaPath)) {
  echo();
  console.error("ERROR: could not open project configuration for reading at '" +
      sourceValaaPath + "'");
  exit(-1);
}
var valaaJson = JSON.parse(cat(sourceValaaPath));
if (!valaaJson || typeof valaaJson !== "object") {
  echo();
  console.error("ERROR: Cannot parse '" + sourceValaaPath + "' as non-null json object: got",
      valaaJson);
  exit(-1);
}
if (!valaaJson.valaa) {
  echo();
  console.error("ERROR: valaa.json missing 'valaa' section");
  exit(-1);
}
if (!valaaJson.valaa.engine) {
  echo();
  console.error("ERROR: valaa.json missing 'valaa.engine' section");
  exit(-1);
}
var projectName = valaaJson.name;
var projectVersion = valaaJson.version;
var packageName = projectName + "." + projectVersion;
var targetDirectory = projectName && projectVersion && path.join("dist/import", packageName);
var engineName = valaaJson.valaa.engine.name;
var engineVersion = valaaJson.valaa.engine.version;

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


if (test("-d", targetDirectory)) {
  exec("rmdir " + targetDirectory);
}

if (test("-d", targetDirectory)) {
  echo();
  console.error("ERROR: target directory", targetDirectory,
      "already exists and could not be cleared. Most likely this version (" + projectVersion
          + ") already exported)");
  exit(-1);
}

var valaaJsonOverrides = process.argv[3] ? JSON.parse(process.argv[3]) : {};

echo();
console.log("Converting to importable valaa project from", sourceDirectory, "to", targetDirectory,
    "using engine", engineName + "." + engineVersion, "with following valaa.json overrides:",
    beautify(JSON.stringify(valaaJsonOverrides)));
echo();

mkdir("-p", targetDirectory);

_.merge(valaaJson, valaaJsonOverrides);
if (Object.keys(_.pick(valaaJson,
    ["name", "version", "description", "author", "license", "private"])).length !== 6) {
  console.error("ERROR: Invalid package.json; missing required fields; name, version, " +
      "description, author, license and private needed, got",
      Object.keys(valaaJson).length, " fields:", Object.keys(valaaJson));
  exit(-1);
}
valaaJson = beautify(JSON.stringify(valaaJson));
echo("Setting", targetDirectory + "/valaa.json contents to:", valaaJson);
ShellString(valaaJson).to(targetDirectory + "/valaa.json");

echo("Copying", sourceDirectory + "/* to", targetDirectory);
cp("-R", sourceDirectory + "/*", targetDirectory);

exec("cd dist/import && tar czf " + packageName + ".tar.gz " + packageName);
exec("mv dist/import/" + packageName + ".tar.gz .");
echo("Created " + packageName + ".tar.gz for Valaa import");
