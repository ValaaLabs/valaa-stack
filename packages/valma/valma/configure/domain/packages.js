exports.command = ".configure/.domain/packages";
exports.summary = "Configure a Valaa repository to be part of the packages utility domain";
exports.describe = `${exports.summary}.

Packages utility domain provides tools for assembling and publishing
packages to npm repositories.`;

exports.builder = (yargs) => yargs.options({
  reconfigure: {
    alias: "r", type: "boolean",
    description: "Reconfigure all packages domain configurations",
  },
});

exports.handler = (yargv) =>
    yargv.vlm.invoke(`.configure/.domain/.packages/**/*`, { reconfigure: yargv.reconfigure });
