#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const configPath = path.join(process.cwd(), "package.json");
if (!shell.test("-f", configPath)) {
  console.log(`Cannot find '${configPath}'`);
  process.exit();
}

const config = require(configPath);

const valaa = config.valaa;
if (!valaa) {
  console.log(`Package '${config.name}' is not a valaa repository (${
      configPath}.json doesn't contain a .valaa section)`);
  process.exit();
}

console.log(`${valaa.domain} ${valaa.type} repository '${config.name}' version ${config.version}`);

shell.exec(`vlm status-details`);
