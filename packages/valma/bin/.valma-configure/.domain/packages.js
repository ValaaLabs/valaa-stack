exports.command = ".configure/.domain/packages";
exports.summary = "Configure a Valaa repository to be part of the packages utility layer domain";
exports.describe = `${exports.summary}. Packages utility layer provides tools for managing${
    ""} packages.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.callValma(`.configure/.domain/.packages/**/*`);
