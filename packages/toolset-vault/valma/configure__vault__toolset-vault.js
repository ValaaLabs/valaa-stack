exports.vlm = { toolset: "@valos/toolset-vault" };
exports.command = ".configure/.type/.vault/@valos/toolset-vault";
exports.describe = "Configure this vault monorepository with toolset-vault";
exports.introduction = `${exports.describe}.

Adds valma commands 'assemble-packages' and 'publish-packages'.

Copies vault monorepo config file templates to this vault repository
root from package @valos/toolset-vault directory templates/.*.`;

// Example template which displays the command name itself and package name where it is ran
// Only enabled inside package
exports.disabled = (yargs) => (yargs.vlm.getPackageConfig("valaa", "type") !== "vault");
exports.builder = (yargs) => yargs.options({
  reconfigure: {
    alias: "r", type: "boolean",
    description: "Reconfigure all toolset-vault configurations",
  },
});

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const templates = vlm.path.join(__dirname, "../templates/{.,}*");
  vlm.info("Copying vault template files from ", templates, "(will not clobber existing files)");
  vlm.shell.cp("-n", templates, ".");

  // TODO(iridian): Convert into dynamic listing maybe?
  const hardcodedDotFiles = ["gitignore", "npmignore", "npmrc"];
  for (const dotFile of hardcodedDotFiles) {
    vlm.shell.cp("-n", vlm.path.join(__dirname, "../template.dots", dotFile), `.${dotFile}`);
  }
};
