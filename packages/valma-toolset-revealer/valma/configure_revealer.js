exports.command = ".configure/revealer";
exports.summary = "Configures revealer for webpacking revelations bundles for this repository";
exports.describe = `${exports.summary}.
Mostly this relates to setting up the webpack entry and output config.
The templates are located in the package @valos/valma-toolset-revealer
directory templates/* which import the bulk of the configs from the
sibling directory shared/*.
`;

// Example template which displays the command name itself and package name where it is ran
// Only enabled inside package
exports.disabled = (yargs) =>
    !yargs.vlm.packageConfig
    || (yargs.vlm.valmaConfig || {})["@valos/valma-toolset-revealer"];
exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const sourceGlob = vlm.path.join(__dirname, "../templates/{.,}*");
  console.log("Copying revealer template files from ", sourceGlob,
      "without overwriting existing files");
  vlm.shell.cp("-n", sourceGlob, ".");
  console.log("Edit project root webpack.config.js to configure webpack entry point and output.")
};
