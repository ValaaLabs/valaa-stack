#!/usr/bin/env vlm

exports.command = "status [toolsetGlob]";
exports.describe = "Display the status of the current package repository";
exports.introduction = `${exports.describe}.

If toolsetGlob is specified the status is limited to status scripts
matching '.status/{toolsetGlob}*', otherwise all status scripts by
'.status/**/*' are used.`;

exports.disabled = (yargs) => !yargs.vlm.packageConfig;
exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  if (!vlm.packageConfig) {
    vlm.error("current directory is not a package repository;",
        "package.json doesn't exist or is not valid.");
    return false;
  }
  await vlm.invoke(`.status/${yargv.toolsetGlob || "**/"}*`, yargv._);
  const valaa = vlm.packageConfig.valaa;
  const ret = [];
  if (valaa && valaa.type) {
    ret.push(vlm.invoke(`.status/.type/.${valaa.type}/${yargv.toolsetGlob || "**/"}*`, yargv._));
  }
  if (valaa && valaa.domain) {
    ret.push(vlm.invoke(`.status/.domain/.${valaa.domain}/${yargv.toolsetGlob || "**/"}*`,
        yargv._));
  }
  return Promise.all(ret);
};
