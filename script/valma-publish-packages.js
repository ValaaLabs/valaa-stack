#!/usr/bin/env node

const shell = require("shelljs");

const packages = shell.find("dist/publish/**/package.json")
    .filter(packagePath => !packagePath.includes("node_modules"))
    .map(packagePath => packagePath.match(/(.*)\/package.json/)[1]);

for (var package of packages) {
  var publishResult = shell.exec(`npm publish ${package}`);
  if (!publishResult.code) {
    shell.rm("-rf", package);
  } else {
    console.log("Published with code", publishResult.code, publishResult);
  }
}
