require("shelljs/global");

// FIXME(iridian): Fix *nix dependencies like rmdir.
// FIXME(iridian): Fix assumed availability of tar/gz.

var synopsis = "bump-version majorMinorOrPatchIndex [newValue]";

if (typeof process.argv[2] === "undefined") {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var majorMinorOrPatchIndex = process.argv[2];
var newValue = process.argv[3];
var valaaJson = JSON.parse(cat("package.json"));
if (!valaaJson || typeof valaaJson !== "object") {
  echo();
  console.error("ERROR: Cannot parse package.json as non-null json object, got:", valaaJson);
  exit(-1);
}
if (typeof valaaJson.version !== "string") {
  echo();
  console.error("ERROR: package.json:version is not a string, got:", valaaJson.version);
  exit(-1);
}

var versionAndBuild = valaaJson.version.split("+");
var build = versionAndBuild[1];
var versionAndPrerelease = versionAndBuild[0].split("-");
var prerelease = versionAndPrerelease[1];
var version = versionAndPrerelease[0].split(".");
if (majorMinorOrPatchIndex < 3) {
  version[majorMinorOrPatchIndex] = (typeof newValue !== "undefined") 
      ? newValue
      : String(Number(version[majorMinorOrPatchIndex]) + 1);
  while ((majorMinorOrPatchIndex += 1) < 3) version[majorMinorOrPatchIndex] = "0";
  majorMinorOrPatchIndex = 0;
}
var newVersion = version.slice(0, 3).join(".");
// Always clear prerelease
newVersion += (majorMinorOrPatchIndex == 3) && newValue ? "-" + newValue : "";
// Always retain build (unless explicitly cleared)
newVersion += (majorMinorOrPatchIndex == 4) 
    ? (newValue ? "+" + newValue : "") 
    : (build ? "+" + build : "");

console.log("Bumping version to", newVersion, "(from " + valaaJson.version + ") and packaging");
exec("npm run set:version " + newVersion);
exec("npm run package");
