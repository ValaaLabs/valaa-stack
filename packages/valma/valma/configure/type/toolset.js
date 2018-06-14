exports.command = ".configure/.type/toolset";
exports.summary = "Configure a Valaa toolset repository";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.callValma(`.configure/.type/.toolset/**/*`);
