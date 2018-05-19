#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const configPath = path.join(process.cwd(), "package.json");
if (!shell.test("-f", configPath)) {
  console.log(`Cannot find '${configPath}'`);
  process.exit();
}

shell.exec(`vlm status-*`);
