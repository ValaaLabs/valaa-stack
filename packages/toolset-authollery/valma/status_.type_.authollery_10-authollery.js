exports.command = ".status/10-authollery";
exports.summary = "Display the authollery status";
exports.describe = `${exports.summary}`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const authollery = yargv.vlm.valmaConfig && yargv.vlm.valmaConfig.authollery;
  if (authollery) {
    console.log(`authollery stack: ${authollery.stack}`);
  } else {
    console.error(`valma-status: valma config authollery section not found (run 'vlm configure')`);
  }
};
