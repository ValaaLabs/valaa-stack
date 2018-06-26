exports.command = ".configure/.type/.vault/@valos/toolset-vault";
exports.summary = "Configure this vault monorepository with toolset-vault";
exports.describe = `${exports.summary}.

Adds valma commands 'package-assemble' and 'package-publish'.

Copies vault monorepo config file templates to this vault repository
root from package @valos/toolset-vault directory templates/.*.`;

// Example template which displays the command name itself and package name where it is ran
// Only enabled inside package
exports.disabled = (yargs) => (((yargs.vlm.packageConfig || {}).valaa || {}).type !== "vault");
exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const templates = vlm.path.join(__dirname, "../templates/{.,}*");
  vlm.info("Copying vault template files from ", templates, "(will not clobber existing files)");
  vlm.shell.cp("-n", templates, ".");
};
