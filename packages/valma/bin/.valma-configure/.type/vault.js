exports.command = ".configure/.type/vault ";
exports.summary = "Configure a Valaa vault repository";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  await yargv.vlm.executeExternal("npm",
      ["install", "--save-dev", "/home/iridian/valaa/vault/packages/valma-toolset-vault"]);
  return yargv.vlm.callValma(`.configure/.type/.vault/**/*`);
};

