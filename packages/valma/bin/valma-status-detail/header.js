#!/usr/bin/env node

const path = require("path");

exports.command = "status-detail/header";
exports.describe = "displays the generic information header for the current repository";
exports.builder = function builder (yargs) { return yargs; };
exports.handler = function handler (/* argv */) {
  const configPath = path.join(process.cwd(), "package.json");

  // eslint-disable-next-line
  const config = require(configPath);

  const valaa = config.valaa;
  if (valaa) {
    console.log(`${valaa.domain} ${valaa.type} repository ${config.name}@${config.version}`);
  } else {
    console.error(`valma-status: package '${config.name}' is not a valaa repository (${
        configPath}.json doesn't contain a .valaa section)`);
  }
};
