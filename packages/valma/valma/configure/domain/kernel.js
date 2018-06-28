exports.command = ".configure/.domain/kernel";
exports.summary = "Configure a Valaa repository to be part of the kernel domain";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs.options({
  reconfigure: {
    alias: "r", type: "boolean",
    description: "Reconfigure all kernel domain configurations",
  },
});

exports.handler = (yargv) =>
    yargv.vlm.invoke(`.configure/.domain/.kernel/**/*`, { reconfigure: yargv.reconfigure });
