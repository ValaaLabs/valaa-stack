exports.command = ".configure/.type/vault";
exports.summary = "Configure a Valaa Vault repository";
exports.describe = `${exports.summary}.

A Valaa Vault is a monorepository containing many sub-packages. Its
main responsibility is to handle the development, assembly and
publishing of those packages.

Will add '@valos/toolset-vault' as devDependency.
Will set package.json .workspaces stanza.
`;

exports.builder = (yargs) => {
  const vlm = yargs.vlm;
  const current = ((vlm.packageConfig || {}).workspaces || [])[0];
  return yargs.options({
    workspaces: {
      type: "string", default: current || "packages/*",
      interactive: {
        type: "input", when: !current ? "always" : "if-undefined",
        message: "Set package.json .workspaces stanza glob for yarn to manage.",
      }
    },
  });
};

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  if (!((vlm.packageConfig || {}).devDependencies || {})["@valos/toolset-vault"]) {
    await vlm.execute("yarn", ["add", "-W", "--dev", "@valos/toolset-vault"]);
  }
  if (!vlm.packageConfig.workspaces || (vlm.packageConfig.workspaces[0] !== yargv.workspaces)) {
    await vlm.updatePackageConfig({ workspaces: [yargv.workspaces] });
    await vlm.execute("yarn", ["install"]);
  }
  await vlm.invoke(`.configure/.type/.vault/**/*`);
};
