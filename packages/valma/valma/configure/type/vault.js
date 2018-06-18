exports.command = ".configure/.type/vault";
exports.summary = "Configure a Valaa vault repository";
exports.describe = `${exports.summary}.
Installs a devDependency to @valos/toolset-vault.`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  if (!((vlm.packageConfig || {}).devDependencies || {})["@valos/toolset-vault"]) {
    await vlm.executeScript("yarn", ["add", "-W", "--dev", "@valos/toolset-vault"]);
  }
  return vlm.callValma(`.configure/.type/.vault/**/*`);
};
