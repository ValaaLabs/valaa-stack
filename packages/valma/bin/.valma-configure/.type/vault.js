exports.command = ".configure/.type/vault";
exports.summary = "Configure a Valaa vault repository";
exports.describe = `${exports.summary}.
Installs a devDependency to @valos/valma-toolset-vault.`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  await yargv.vlm.executeExternal("npm", ["install", "--save-dev", "@valos/valma-toolset-vault"]);
  return yargv.vlm.callValma(`.configure/.type/.vault/**/*`);
};

