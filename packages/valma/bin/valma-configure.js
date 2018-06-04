exports.command = "configure [moduleglob]";
exports.summary = "Configure the current valaa repository and its valma modules";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs.options({
  reconfigure: {
    type: "boolean", default: false, global: true,
    description: "revisits all repository and module configuration options.",
  }
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  vlm.reconfigure = yargv.reconfigure;
  if (!vlm.packageConfig) {
    throw new Error("valma-configure: current directory is not a repository; "
        + "package.json does not exist");
  }
  const valaa = vlm.packageConfig.valaa;
  if (!valaa || !valaa.type || !valaa.domain) {
    throw new Error("valma-configure: current directory is not a valaa repository; "
        + "package.json does not have valaa section, or valaa.type or valaa.domain settings"
        + "(maybe run 'vlm init'?)");
  }
  if (!yargv.moduleglob) {
    await vlm.callValma(`.configure/.modules`, yargv._.slice(1));
  }
  await vlm.callValma(`.configure/{,.type/.${valaa.type}/,.domain/.${valaa.type}/}.module/${
      yargv.moduleglob || ""}{*/**/,}*`);
};
