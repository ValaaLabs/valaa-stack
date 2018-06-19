exports.command = ".configure/.domain/kernel";
exports.summary = "Configure a Valaa repository to be part of the kernel domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.invoke(`.configure/.domain/.kernel/**/*`);
