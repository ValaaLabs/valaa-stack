#!/usr/bin/env vlm

exports.command = "status [toolsetglob]";
exports.describe = "Display the status of the current package repository";
exports.introduction = `${exports.describe}.

If toolsetglob is specified the status is limited to status scripts
matching '.status/{toolsetglob}*', otherwise all status scripts by
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
  const vargs = yargv._.slice(1);
  await vlm.invoke(`.status/${yargv.toolsetglob || "**/"}*`, vargs);
  const valaa = vlm.packageConfig.valaa;
  const ret = [];
  if (valaa && valaa.type) {
    ret.push(vlm.invoke(`.status/.type/.${valaa.type}/${yargv.toolsetglob || "**/"}*`, vargs));
  }
  if (valaa && valaa.domain) {
    ret.push(vlm.invoke(`.status/.domain/.${valaa.domain}/${yargv.toolsetglob || "**/"}*`, vargs));
  }
  return Promise.all(ret);
};
