require("shelljs/global");
var path = require("path");
var _ = require("lodash");
var beautify = require("js-beautify").js_beautify;

var synopsis = "export-valaa-engine targetDirectory [valaaJsonOverrides]";

if (!process.argv[2]) {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var sourceDirectory = ".";
var packageName = process.argv[2];
var targetDirectory = packageName && path.join("dist/import", packageName);

if (!targetDirectory) {
  echo();
  console.error("ERROR: targetDirectory missing");
}
if (!sourceDirectory || !targetDirectory) exit(-1);


if (!test("-f", sourceDirectory + "/package.json")) {
  echo();
  console.error("ERROR: source", sourceDirectory, "/package.json doesn't exist");
  exit(-1);
}

if (test("-d", targetDirectory)) {
  exec("rmdir " + targetDirectory);
}

if (test("-d", targetDirectory)) {
  echo();
  console.error("ERROR: target directory", targetDirectory,
      "already exists and could not be cleared (not empty)");
  exit(-1);
}

var valaaJsonOverrides = process.argv[3] ? JSON.parse(process.argv[3]) : {};

echo();
console.log("Converting to importable valaa engine from", sourceDirectory, "to", targetDirectory,
    "with following valaa.json overrides:", beautify(JSON.stringify(valaaJsonOverrides)));
echo();

mkdir("-p", targetDirectory);

var packageConfig = _.pick(JSON.parse(cat(sourceDirectory + "/package.json")),
    ["name", "version", "description", "author", "license", "private"]);
_.merge(packageConfig, valaaJsonOverrides);
if (Object.keys(packageConfig).length !== 6) {
  console.error("ERROR: Invalid package.json; missing required fields; name, version, " +
      "description, " + "author, license and private needed, got",
      Object.keys(packageConfig).length, " fields:", Object.keys(packageConfig));
  exit(-1);
}
packageConfig.valaa = {
  type: "engine",
  descriptions: { "en-US": packageConfig.description },
};
var valaaJson = beautify(JSON.stringify(packageConfig));
echo("Setting", targetDirectory + "/valaa.json contents to:", valaaJson);
ShellString(valaaJson).to(targetDirectory + "/valaa.json");

echo("Rebuilding valaa.js");
exec("npm run build");

echo("Copying engine/* to", targetDirectory);
cp("-R", sourceDirectory + "/engine/*", targetDirectory);

echo("Copying dist/public/js/valaa.js to", targetDirectory + "/js/valaa.js");
cp("-R", sourceDirectory + "/dist/public/js/valaa.js", targetDirectory + "/js/valaa.js");
echo("Copying dist/public/js/valaa.js.map to", targetDirectory + "/js/valaa.js.map");
cp("-R", sourceDirectory + "/dist/public/js/valaa.js.map", targetDirectory + "/js/valaa.js.map");

exec("cd dist/import && tar czf " + packageName + ".tar.gz " + packageName);
exec("mv dist/import/" + packageName + ".tar.gz .");
echo("Created " + packageName + ".tar.gz for Valaa import");
