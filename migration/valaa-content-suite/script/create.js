require("shelljs/global");
var path = require("path");
var beautify = require("js-beautify").js_beautify;

var synopsis = "create project-name target-directory [engine-name[@engine-version]]";

if (!process.argv[3]) {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var sourceDirectory = ".";
var projectName = process.argv[2];
var targetDirectory = process.argv[3];

var packageJson = JSON.parse(cat("package.json"));
if (!packageJson || typeof packageJson !== "object") {
  echo();
  console.error("ERROR: Cannot parse package.json as non-null json object, got:", packageJson);
  exit(-1);
}
if (typeof packageJson.version !== "string") {
  echo();
  console.error("ERROR: package.json:version is not a string, got:", packageJson.version);
  exit(-1);
}
if (!packageJson.config) {
  echo();
  console.error("ERROR: package.json:config section missing");
  exit(-1);
}

var packageAuthor = packageJson.config.package_author;
var suiteVersion = packageJson.version;
var engineDirectory = packageJson.config.valaa_engine;
var valaaHost = packageJson.config.valaa_host;
var valaaUser = packageJson.config.valaa_user;

if (!projectName) {
  echo();

  // TODO(iridian): Add interactive input and validation.
  console.error("ERROR: project-name missing");
}

if (!targetDirectory) {
  echo();

  // TODO(iridian): Add interactive input and validation.
  console.error("ERROR: targetDirectory missing");
}

if (!sourceDirectory || !targetDirectory) exit(-1);

if (!test("-d", engineDirectory)) {
  console.error("ERROR: valaa-content-suite not properly configured: 'engine_directory' ('" +
      engineDirectory + "') cannot be read (missing or incorrect permissions)");
  exit(-1);
}

var enginePackageJson = cat(engineDirectory + "/package.json");
var enginePackage = JSON.parse(enginePackageJson);
if (!enginePackageJson || !enginePackage) {
  console.error("ERROR: valaa-content-suite not properly configured: package.json could not be " +
      "opened for reading or is not a JSON file in 'engine_directory' ('" +
      engineDirectory + "')");
  exit(-1);
}

var engineValaa = enginePackage.valaa;
if (!engineValaa) {
  console.error("ERROR: valaa-content-suite not properly configured:",
      "package.json missing 'valaa' section");
  exit(-1);
}

if (engineValaa.type !== "engine") {
  console.error("ERROR: valaa-content-suite not properly configured:",
      "package.json:valaa.type is not 'engine'");
  exit(-1);
}

var engineName = enginePackage.name;
var engineVersion = enginePackage.version;

if (process.argv[4]) {
  const engineAndVersion = process.argv[4].split("@");
  engineName = engineAndVersion[0];
  engineVersion = engineAndVersion[1] || "*";
}

if (!test("-d", targetDirectory)) {
  console.log("Target directory '", targetDirectory, "' doesn't exist, creating it");
  mkdir("-p", targetDirectory);
  if (!test("-d", targetDirectory)) {
    console.log("Failed to create directory '", targetDirectory, "'");
    exit(-1);
  }
} else {
  console.log("Target directory '", targetDirectory, "' exists, BLINDLY OVERWRITING CONTENT");

  // TODO(iridian): Do not blindly overwrite content.
}

echo();
console.log("Copying project directory structure and scripts template to", targetDirectory);

cp("-R", "script/data/project/.*", targetDirectory);
cp("-R", "script/data/project/*", targetDirectory);

var packageConfig = JSON.parse(cat("script/data/project/package.json"));
packageConfig.name = projectName;
packageConfig.config.remote = valaaHost + "/game/" + projectName + "/latest";
packageConfig.config.engine = engineDirectory;
packageConfig.author = packageAuthor;
packageConfig.description = "Project '" + projectName + "'";
packageConfig.valaa = {
  type: "project",
  engine: {
    name: engineName,
    version: engineVersion,
  },
  descriptions: {
    "en-US": packageConfig.description,
  },
  suite: {
    version: suiteVersion,
    host: valaaHost,
    user: valaaUser
  },
};

echo("Writing", targetDirectory + "/package.json contents");
ShellString(beautify(JSON.stringify(packageConfig))).to(targetDirectory + "/package.json");
echo();
echo("Installing script packages to", targetDirectory + "");
cd(targetDirectory);
exec("npm install");
if (!test("-d", ".git")) {
  echo("No existing .git/ repository, creating initial");
  exec("git init");
}
echo("Committing files to initial commit");
exec("git add .gitignore");
exec("git add dist");
exec("git add *");
exec("git commit -m 'Initial empty Valaa project files commit for project: " + projectName + "'");
console.log("Successfully created empty Valaa project '" + projectName + "' repository at",
    targetDirectory);
