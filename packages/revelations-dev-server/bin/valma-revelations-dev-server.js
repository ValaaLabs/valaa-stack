#!/usr/bin/env node

const shell = require("shelljs");

const contentBase = process.argv[2] || "dist/public";
if (!process.argv[2]) console.log("Defaulting to dist/public as the webpack-dev-server --content-base");

if (!shell.test("-d", contentBase)) {
  console.log("Content base directory", contentBase,
      "missing; creating and populating it (for this first time only) from ./revelations/");
  shell.mkdir("-p", contentBase);
  shell.cp("-R", "revelations/*", contentBase);
}

shell.exec(`npx -c "webpack-dev-server --inline --progress --open --host 0.0.0.0 --content-base ${contentBase}"`);
