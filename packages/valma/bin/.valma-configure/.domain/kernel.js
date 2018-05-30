exports.command = ".configure/.domain/kernel";
exports.summary = "Configure a Valaa repository for kernel domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.callValma(`.configure/.domain/.kernel/**/*`);
