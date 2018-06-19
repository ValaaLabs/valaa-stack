#!/usr/bin/env vlm

exports.command = "status [toolsetglob]";
exports.summary = "Display the status of the current package repository";
exports.describe = `${exports.summary}.

If toolsetglob is specified the status is limited to status scripts
matching '.status/{toolsetglob}*', otherwise all status scripts by
'.status/**/*' are used.`;

exports.disabled = (yargs) => !yargs.vlm.packageConfig;
exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  if (!vlm.packageConfig) {
    console.error(vlm.colors.error("valma-status: current directory is not a package repository;",
        "package.json doesn't exist or is not valid."));
    return undefined;
  }
  await vlm.invoke(`.status/${yargv.toolsetglob || "**/"}*`, yargv._.slice(1));
  const valaa = vlm.packageConfig.valaa;
  const ret = [];
  if (valaa && valaa.type) {
    ret.push(vlm.invoke(`.status/.type/.${valaa.type}/${yargv.toolsetglob || "**/"}*`,
        yargv._.slice(1)));
  }
  if (valaa && valaa.domain) {
    ret.push(vlm.invoke(`.status/.domain/.${valaa.domain}/${yargv.toolsetglob || "**/"}*`));
  }
  return Promise.all(ret);
};
