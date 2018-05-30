exports.command = ".configure/.type/authollery";
exports.summary = "Configure a Valaa authollery repository";
exports.describe = `${exports.summary}. Autholleries (ie. authority controller repositories) are ${
    ""} used to configure, deploy, update and monitor live infrastructure resources relating to ${
    ""} a particular Valaa authority.`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  await yargv.vlm.executeExternal("npm",
      ["install", "--save-dev", "/home/iridian/valaa/vault/packages/valma-toolset-authollery"]);
  return yargv.vlm.callValma(`.configure/.type/.authollery/**/*`);
}
