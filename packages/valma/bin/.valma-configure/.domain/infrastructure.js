exports.command = ".configure/.domain/infrastructure";
exports.summary = "Configure a Valaa repository for infrastructure domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.callValma(`.configure/.domain/.infrastructure/**/*`);
