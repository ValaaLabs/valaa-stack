#!/usr/bin/env node

const path = require("path");

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
