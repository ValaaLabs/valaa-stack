#!/usr/bin/env node

require("shelljs/global");

var contentBase = process.argv[2];

if (!contentBase) {
  console.log("Defaulting to dist/public as the dev-webpack --content-base");
  contentBase = "dist/public";
}

if (!test("-d", contentBase)) {
  console.log("Content base directory", contentBase,
      "missing; creating and populating it (for this first time only) from ./revelations/");
  mkdir("-p", contentBase);
  cp("-R", "revelations/*", contentBase);
}

exec("npm run dev-webpack " + contentBase);
