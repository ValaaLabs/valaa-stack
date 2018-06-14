exports.command = ".configure/.type/module";
exports.summary = "Configure a Valma module repository";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  await vlm.askToCreateValmaScriptSkeleton(
      `.valma-configure/.type/.${vlm.packageConfig.valaa.domain}/${vlm.packageConfig.name}`,
      "valma-configure_module.js",
      "component configure",
      `Configure the module ${vlm.packageConfig.name} for the current repository`,
`This script is automatically called when a repository with a type equal to
the domain of this module gets configured.`);

  return yargv.vlm.callValma(`.configure/.type/.module/**/*`);
}
