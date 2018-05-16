#!/usr/bin/env node

const shell = require("shelljs");

const packagesDist = "dist/packages";
const valaaDist = `${packagesDist}/@valaa`;
shell.mkdir("-p", valaaDist);

// valma
const valmaDirectory = `${packagesDist}/valma`;
console.log("\nAssembling package 'valma' into", valmaDirectory, "\n");
shell.rm("-rf", valmaDirectory);
shell.cp("-R", `src/valma`, valmaDirectory);

// @valaa/vault itself
const vaultDirectory = `${valaaDist}/vault`;
console.log("\nAssembling package '@valaa/vault' into", vaultDirectory, "\n");
shell.rm("-rf", vaultDirectory);
shell.mkdir(vaultDirectory);
shell.cp(`package.json`, vaultDirectory);
shell.cp("-R", `bin`, vaultDirectory);

// @valaa primary sub-packages in src/*
for (var subPackage of ["tools", "core", "script", "prophet", "engine", "inspire"]) {
  var subPackageDirectory = `${valaaDist}/${subPackage}`;
  console.log(`\nAssembling package '@valaa/${subPackage}' into`, subPackageDirectory, "\n");
  shell.rm("-rf", subPackageDirectory);
  shell.cp("-R", `src/${subPackage}`, subPackageDirectory);
  shell.exec(`babel src/${subPackage} --out-dir ${subPackageDirectory}`);
}
