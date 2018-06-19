exports.command = ".configure/.type/.vault/copy-vault-templates";
exports.summary = "Initialize vault monorepo config files from templates";
exports.describe = `${exports.summary}.
Config templates are located in the package @valos/toolset-vault
directory templates/*.`;

exports.builder = (yargs) => yargs;
exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const sourceGlob = vlm.path.join(__dirname, "../templates/{.,}*");
  console.log("Copying vault templates from ", sourceGlob, "without overwriting existing files");
  vlm.shell.cp("-n", sourceGlob, ".");
};
