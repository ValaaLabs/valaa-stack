const path = require("path");

exports.command = "status [moduleglob]";
exports.summary = "Display the status of the current repository and its valma modules";
exports.describe = `${exports.summary
    }. If moduleglob is specified limits the status those modules.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  if (!yargv.vlm.packageConfig) {
    console.error("valma-status: current directory is not a repository;",
        "package.json does not exist or is not a file");
    return undefined;
  }
  return yargv.vlm.callValma(path.posix.join(".status", yargv.moduleglob || "**/*"),
      yargv._.slice(1));
};
