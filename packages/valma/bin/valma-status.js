exports.command = "status [moduleglob]";
exports.summary = "Display the status of the current repository and its valma modules";
exports.describe = `${exports.summary
    }. If moduleglob is specified the status is limited to status scripts matching ${
    ""}'.status/{moduleglob}*', otherwise all status scripts by '.status/**/*' are used.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  if (!yargv.vlm.packageConfig) {
    console.error("valma-status: current directory is not a repository;",
        "package.json does not exist or is not a file");
    return undefined;
  }
  return yargv.vlm.callValma(`.status-${yargv.moduleglob || ""}*`, yargv._.slice(1));
};
