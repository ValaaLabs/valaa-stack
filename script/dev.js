require("shelljs/global");
var path = require("path");

var synopsis = "dev projectDirectory";

if (!process.argv[2]) {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var projectDirectory = process.argv[2];

var engineConfig = JSON.parse(cat("package.json"));
if (projectDirectory !== engineConfig.config.project) {
  console.log("Note! Running custom project '" + projectDirectory + "', requested either from " +
      "an explicit parameter to 'npm run dev', or as a config override from 'npm config get " +
      engineConfig.name + ":project'");
}

if (!test("-d", projectDirectory)) {
  echo();
  console.error("ERROR: project directory '" + projectDirectory + "' doesn't exist");
  exit(-1);
}
var packageJsonPath = path.join(projectDirectory, "package.json");
var valaaJsonPath = path.join(projectDirectory, "valaa.json");
var packageConfigPath;
var projectDistPath;
if (test("-f", packageJsonPath)) {
  packageConfigPath = packageJsonPath;
  projectDistPath = path.join(projectDirectory, "dist");
} else if (test("-f", valaaJsonPath)) {
  packageConfigPath = valaaJsonPath;
  projectDistPath = projectDirectory;
} else {
  echo();
  console.error("ERROR: can't open neither '" + packageJsonPath + "' nor '" + valaaJsonPath +
      "' for reading");
  exit(-1);
}

var packageConfig = JSON.parse(cat(packageConfigPath));

if (!packageConfig || typeof packageConfig !== "object") {
  echo();
  console.error("ERROR: Cannot parse '" + packageConfigPath + "' as JSON object, (content: '\n" +
      cat(packageConfigPath) + "\n')");
  exit(-1);
}
if (!packageConfig.valaa || typeof packageConfig.valaa !== "object") {
  echo();
  console.error("ERROR: project config '" + packageConfigPath + "'.valaa missing or not an object");
  exit(-1);
}
if (packageConfig.valaa.type !== "project") {
  echo();
  console.error("ERROR: project config '" + packageConfigPath + "':valaa.type is not 'project' " +
      "(got: '" + packageConfig.valaa.type + "')");
  exit(-1);
}
// TODO(iridian): Should we check if projects' engine directive matches us? Now running anyway.
// if (!packageConfig.valaa.engine) {

var bundlePath = "./dist/devBundles/" + projectDirectory.replace(':', '').split("/").join("");

// Bundle content. This is a bit heavy for larger projects, but couldn't come with any other easy
// way to merge the project on top of the engine.
rm("-rf", bundlePath);
mkdir("-p", bundlePath);
cp("-R", "engine/*", bundlePath);
cp("-R", path.join(projectDistPath, "*"), bundlePath);

exec("npm run dev-webpack " + bundlePath);
