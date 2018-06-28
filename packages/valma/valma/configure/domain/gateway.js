exports.command = ".configure/.domain/gateway";
exports.summary = "Configure a valaa repository to be part of the gateway domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs.options({
  reconfigure: {
    alias: "r", type: "boolean",
    description: "Reconfigure all gateway domain configurations",
  },
});

exports.handler = (yargv) =>
    yargv.vlm.invoke(`.configure/.domain/.gateway/**/*`, { reconfigure: yargv.reconfigure });
