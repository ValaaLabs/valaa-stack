exports.command = ".configure/.domain/gateway";
exports.summary = "Configure a valaa repository for gateway domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.callValma(`.configure/.domain/.gateway/**/*`);
