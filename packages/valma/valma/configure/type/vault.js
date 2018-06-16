exports.command = ".configure/.type/vault";
exports.summary = "Configure a Valaa vault repository";
exports.describe = `${exports.summary}.
Installs a devDependency to @valos/valma-toolset-vault.`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  if (!((vlm.packageConfig || {}).devDependencies || {})["@valos/valma-toolset-vault"]) {
    await vlm.executeExternal("yarn", ["add", "-W", "--dev", "@valos/valma-toolset-vault"]);
  }
  return vlm.callValma(`.configure/.type/.vault/**/*`);
};
