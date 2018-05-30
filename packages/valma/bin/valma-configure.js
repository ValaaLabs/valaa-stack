exports.command = "configure [moduleglob]";
exports.summary = "Configure the current valaa repository and its valma modules";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs.options({
  reinitialize: {
    type: "boolean", default: false, global: true,
    description: "revisits all repository and module configuration options.",
  }
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  vlm.reinitialize = yargv.reinitialize;
  if (!vlm.packageConfig) {
    throw new Error("valma-configure: current directory is not a repository; "
        + "package.json does not exist");
  }
  let valaa = vlm.packageConfig.valaa;
  if (yargv.moduleglob) {
    if (!valaa) {
      throw new Error("valma-configure: current directory is not a valaa repository; "
          + "package.json does not have valaa section "
          + "(maybe run 'vlm configure' without module selector'?)");
    }
    await vlm.callValma(`.configure-${yargv.moduleglob}*"`, yargv._.slice(1));
  } else {
    if (!valaa || yargv.reinitialize) {
      await vlm.callValma(".configure.initialize", yargv._.slice(1));
      valaa = vlm.packageConfig.valaa;
      if (!valaa || !valaa.type || !valaa.domain) {
        throw new Error("valma-configure: cannot find valaa.type or valaa.domain during (re)init");
      }
    }
    await vlm.callValma(`.configure.type-${valaa.type}`, yargv._.slice(1));
    await vlm.callValma(`.configure.domain-${valaa.domain}`, yargv._.slice(1));
    await vlm.callValma(`.configure-*`, yargv._.slice(1));
  }
};
