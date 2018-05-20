#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

exports.command = "status [glob]";
exports.describe = "displays the valaa status of current repository via 'vlm status-detail/[glob]'";
exports.builder = function builder (yargs) { return yargs; };
exports.handler = function handler (argv) {
  const configPath = path.join(process.cwd(), "package.json");
  if (!shell.test("-f", configPath)) {
    console.log(`Cannot find '${configPath}'`);
    return;
  }
  argv.vlm(`status-detail/${argv.glob || "*"}`, argv._.slice(1));
};
