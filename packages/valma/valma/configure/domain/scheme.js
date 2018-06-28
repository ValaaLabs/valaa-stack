exports.command = ".configure/.domain/scheme";
exports.summary = "Configure a Valaa repository to be part of the scheme domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs.options({
  reconfigure: {
    alias: "r", type: "boolean",
    description: "Reconfigure all scheme domain configurations",
  },
});

exports.handler = (yargv) =>
    yargv.vlm.invoke(`.configure/.domain/.scheme/**/*`, { reconfigure: yargv.reconfigure });
