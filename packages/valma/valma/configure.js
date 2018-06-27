#!/usr/bin/env vlm

exports.command = "configure [toolsetGlob]";
exports.summary = "Configure the current valaa repository and its toolsets";
exports.describe = `${exports.summary}.

Invokes all the in-use toolset configure commands.`;

exports.disabled = (yargs) => !yargs.vlm.getPackageConfig("valaa");
exports.builder = (yargs) => yargs.options({
  reconfigure: {
    type: "boolean", default: false, global: true,
    description: "If not set configure will skip all already configured toolsets.",
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
        + "package.json doesn't have the valaa section or it doesn't have valaa.type/domain set"
        + "(maybe run 'vlm init' to initialize?)");
  }
  if (!vlm.valmaConfig) {
    vlm.updateValmaConfig({});
  }

  const rest = yargv._.slice(1);

  if (!yargv.toolsetGlob) {
    await vlm.invoke(`.configure/.domain/${valaa.domain}`, rest);
    await vlm.invoke(`.configure/.type/${valaa.type}`, rest);
    await vlm.invoke(`.configure/.toolsets`, rest);
  }
  return await vlm.invoke(`.configure/{,.type/.${valaa.type}/,.domain/.${valaa.domain}/}.toolset/${
      yargv.toolsetGlob || ""}{*/**/,}*`, rest);
};
