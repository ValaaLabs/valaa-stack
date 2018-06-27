exports.command = ".configure/.type/.vault/.toolset/@valos/toolset-vault-operations";
exports.summary = "Configure the toolset 'toolset-vault-operations' for the current vault";
exports.describe = `${exports.summary}.
This script makes the toolset 'toolset-vault-operations' available for
grabbing by repositories with valaa type 'vault'.`;

exports.disabled = (yargs) => !yargs.vlm.packageConfig;
exports.builder = (yargs) => {
  const vlm = yargs.vlm;
  return vlm && yargs;
};

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  return vlm && true;
};
