exports.command = ".configure/.type/.authollery/@valos/toolset-authollery";
exports.summary = "Configure this authollery controller repository with toolset-authollery";
exports.describe = `${exports.summary}.

Adds valma commands 'release-build' and 'release-deploy'.

Copies vault monorepo config file templates to this vault repository
root from package @valos/toolset-authollery directory templates/.*.`;

// Example template which displays the command name itself and package name where it is ran
// Only enabled inside package
exports.disabled = (yargs) => (yargs.vlm.getPackageConfig("valaa", "type") !== "authollery");
exports.builder = (yargs) => yargs.options({
  reconfigure: {
    alias: "r", type: "boolean",
    description: "Reconfigure all toolset-authollery configurations",
  },
});

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const templates = vlm.path.join(__dirname, "../templates/{.,}*");
  vlm.info("Copying missing authollery config files", " from templates at:", templates,
      "(will not clobber existing files)");
  vlm.shell.cp("-n", templates, ".");
};
