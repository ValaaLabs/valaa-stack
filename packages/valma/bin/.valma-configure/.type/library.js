exports.command = ".configure/.type/library";
exports.summary = "Configure a Valaa library repository";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.callValma(`.configure/.type/.library/**/*`);
