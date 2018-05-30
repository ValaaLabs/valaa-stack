exports.command = ".configure/.type/.authollery/00-available-stacks";
exports.summary = "Configure available authollery stacks";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => {
  const authollery = (yargs.vlm.valmaConfig || {}).authollery || {};
  return yargs.options({
    stack: {
      type: "string", default: authollery.stack || "",
      interactive: { type: "input", prompt: "always" },
      description: "authollery stack name",
    },
  });
};

exports.handler = (yargv) => {
  if ((yargv.vlm.packageConfig.valaa || {}).type !== "authollery") return;
  yargv.vlm.updateValmaConfig({
    "authollery": {
      stack: yargv.stack,
    },
  });
};
