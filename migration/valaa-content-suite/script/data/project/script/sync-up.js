require("shelljs/global");
var path = require("path");

// TODO(iridian): Set the suite up so that config.engine by default refers to appropriately installed node_modules/<valaaEngine>
// FIXME(iridian): While implementing above, something is still broken: webpack creates an empty valaa.min.js

var synopsis = "sync-up remote_url";

if (typeof process.argv[2] === "undefined") {
  console.log("Synopsis:", synopsis);
  exit(0);
}

console.log("sync-up not implemented yet");
exit(-1);
