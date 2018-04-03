require("shelljs/global");
var beautify = require("js-beautify").js_beautify;

// FIXME(iridian): Fix *nix dependencies like rmdir.
// FIXME(iridian): Fix assumed availability of tar/gz.

var synopsis = "set-package-json-value valuePath newValue";

if (typeof process.argv[3] === "undefined") {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var valuePath = process.argv[2].split("/");
var newValue = process.argv[3];

var packageJson = JSON.parse(cat("package.json"));
if (!packageJson || typeof packageJson !== "object") {
  echo();
  console.error("ERROR: Cannot parse package.json as non-null json object, got:", packageJson);
  exit(-1);
}

var valueParent = valuePath.slice(0, -1).reduce(function (section, key) {
  if (typeof section !== "object") {
    throw new Error("Non-object path step (" + JSON.stringify(section) + 
        ") encounted during set-package-json-value.js " + valuePath.join(".") + " " + newValue);
  }
  return section[key] || (section[key] = {}); 
}, packageJson);
console.log("Setting package.json:" + valuePath.join("."), "to:", newValue, ", was:",
    valueParent[valuePath[valuePath.length - 1]]);
valueParent[valuePath[valuePath.length - 1]] = newValue;

var newPackageJsonText = beautify(JSON.stringify(packageJson));
console.log("Writing new package.json")
ShellString(newPackageJsonText).to("package.json");