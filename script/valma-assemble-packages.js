#!/usr/bin/env node

const shell = require("shelljs");

const packagesDist = "dist/packages";
const valaaDist = `${packagesDist}/@valos`;
shell.mkdir("-p", valaaDist);

// valma
const valmaDirectory = `${packagesDist}/valma`;
console.log("\nAssembling package 'valma' into", valmaDirectory, "\n");
shell.rm("-rf", valmaDirectory);
shell.cp("-R", `src/valma`, valmaDirectory);

// @valos/vault itself
const vaultDirectory = `${valaaDist}/vault`;
console.log("\nAssembling package '@valos/vault' into", vaultDirectory, "\n");
shell.rm("-rf", vaultDirectory);
shell.mkdir(vaultDirectory);
shell.cp(`package.json`, vaultDirectory);
shell.cp("-R", `bin`, vaultDirectory);

// @valos primary sub-packages in src/*
for (var subPackage of ["tools", "core", "script", "prophet", "engine", "inspire"]) {
  var subPackageDirectory = `${valaaDist}/${subPackage}`;
  console.log(`\nAssembling package '@valos/${subPackage}' into`, subPackageDirectory, "\n");
  shell.rm("-rf", subPackageDirectory);
  shell.cp("-R", `src/${subPackage}`, subPackageDirectory);
  shell.exec(`babel src/${subPackage} --out-dir ${subPackageDirectory}`);
}
