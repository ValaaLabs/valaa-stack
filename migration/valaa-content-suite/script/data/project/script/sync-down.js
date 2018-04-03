require("shelljs/global");
var path = require("path");

// TODO(iridian): Set the suite up so that config.engine by default refers to appropriately installed node_modules/<valaaEngine>
// FIXME(iridian): While implementing above, something is still broken: webpack creates an empty valaa.min.js

var synopsis = "sync-down remote_url [repository_name]";

if (typeof process.argv[2] === "undefined") {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var remoteUrl = process.argv[2];
var repositoryName = process.argv[3];

exec("wget -O dist/project.event.json " + remoteUrl + "/project.event.json");
exec("node script/remove-deprecated-fields.js");

var localManifestJson = test("-f", "dist/media.manifest.json") && cat("dist/media.manifest.json");

var localManifest = localManifestJson && JSON.parse(localManifestJson) || {};
exec("wget -O temp.media.manifest.json " + remoteUrl + "/media.manifest.json");
var remoteManifest = JSON.parse(cat("temp.media.manifest.json"));
var mediaDownloads = [];
Object.keys(remoteManifest).forEach(function (key) {
  const localMediaInfo = localManifest[key];
  const remoteMediaInfo = remoteManifest[key];
  if (repositoryName && remoteMediaInfo.repositoryName 
      && remoteMediaInfo.repositoryName !== repositoryName) {
    console.log("Skipping remote media '" + key
        + "' which belongs to repository '" + remoteMediaInfo.repositoryName
        + "' (only syncing repository '" + repositoryName + "' media)");
  } else if (!localMediaInfo || (localMediaInfo.modified < remoteMediaInfo.modified)) {
    console.log("Updating stale local media (" 
        + (localMediaInfo ? "local modified " + localMediaInfo.modified : "new local file")
        + " < remote " + remoteMediaInfo.modified + ") '" 
        + key + "'");
    const directory = path.dirname(key);
    mkdir("-p", "dist/" + directory);
    exec("wget -O dist/" + key + " " + remoteUrl + "/" + key);
    if (key === "project.event.json") {
      exec("node script/remove-deprecated-fields.js");
    }
  } else if (localMediaInfo.modified === remoteMediaInfo.modified) {
    console.log("Skipping up to date media (modified " + localMediaInfo.modified + ") '" 
        + key + "'");
  } else {
    console.log("Skipping newer local media (local modified " + localMediaInfo.modified 
        + " > remote " + remoteMediaInfo.modified + ") '" 
        + key + "'");
  }
});
rm("-f", "dist/media.manifest.json");
mv("temp.media.manifest.json", "dist/media.manifest.json");
console.log("Updated dist/media.manifest.json");