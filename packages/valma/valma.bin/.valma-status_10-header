#!/usr/bin/env vlm

exports.command = ".status/10-header";
exports.summary = "Display the generic information header for the current repository";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const config = yargv.vlm.packageConfig;
  const valaa = config && config.valaa;
  if (valaa && valaa.type && valaa.domain) {
    console.log(`${valaa.domain} ${valaa.type} ${config.name}@${config.version}`);
  } else {
    console.log(
`package '${config && config.name}' is not a valaa repository. Either
package.json doesn't have the .valaa stanza or its .domain or .type is
not set. Call 'vlm init' to initialize.
`);
  }
};
