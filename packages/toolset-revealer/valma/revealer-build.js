#!/usr/bin/env vlm

exports.command = "revealer-build";
exports.summary = "Build revealer bundles based on the revealer toolset config";
exports.describe = `${exports.summary}.
`;

// Example template which displays the command name itself and package name where it is ran
// Only enabled inside package
exports.disabled = (yargs) => !yargs.vlm.packageConfig;
exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
};
