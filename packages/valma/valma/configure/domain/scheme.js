exports.command = ".configure/.domain/scheme";
exports.summary = "Configure a Valaa repository to be part of the scheme domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.callValma(`.configure/.domain/.scheme/**/*`);
