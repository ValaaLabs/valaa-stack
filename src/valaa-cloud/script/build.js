// @todo this should work on linux and cygwin, but will require node, npm and zip installed
// for installations of those tools should be checked
const exec = require("shelljs").exec;

exec("npm install");
exec("node_modules/.bin/webpack");
exec("node script/build-zips.js");
