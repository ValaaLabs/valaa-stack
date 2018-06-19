exports.command = ".configure/.domain/infrastructure";
exports.summary = "Configure a Valaa repository to be part of the infrastructure domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.invoke(`.configure/.domain/.infrastructure/**/*`);
