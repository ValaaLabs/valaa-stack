exports.command = ".configure/.domain/infrastructure";
exports.summary = "Configure a Valaa repository to be part of the infrastructure domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs.options({
  reconfigure: {
    alias: "r", type: "boolean",
    description: "Reconfigure all infrastructure domain configurations",
  },
});

exports.handler = (yargv) =>
    yargv.vlm.invoke(`.configure/.domain/.infrastructure/**/*`, { reconfigure: yargv.reconfigure });
