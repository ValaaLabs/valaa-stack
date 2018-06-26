exports.command = ".configure/.type/.authollery/.toolset/@valos/toolset-authollery";
exports.summary = "Configure this authollery as an authority controller with toolset-authollery";
exports.describe = `${exports.summary}.

Adds valma commands 'release-build' and 'release-deploy'.

Copies vault monorepo config file templates to this vault repository
root from package @valos/toolset-vault directory templates/.*.`;

// Example template which displays the command name itself and package name where it is ran
// Only enabled inside package
exports.disabled = (yargs) => (((yargs.vlm.packageConfig || {}).valaa || {}).type !== "authollery");
exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const templates = vlm.path.join(__dirname, "../templates/{.,}*");
  vlm.info("Copying missing authollery config files", " from templates at:", templates,
      "(will not clobber existing files)");
  vlm.shell.cp("-n", templates, ".");
};
