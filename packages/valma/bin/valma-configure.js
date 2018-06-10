exports.command = "configure [moduleglob]";
exports.summary = "Configure the current valaa repository and its valma modules";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs.options({
  reconfigure: {
    type: "boolean", default: false, global: true,
    description: "revisits all repository and module configuration options.",
  }
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  vlm.reconfigure = yargv.reconfigure;
  if (!vlm.packageConfig) {
    throw new Error("valma-configure: current directory is not a repository; "
        + "package.json does not exist");
  }
  const valaa = vlm.packageConfig.valaa;
  if (!valaa || !valaa.type || !valaa.domain) {
    throw new Error("valma-configure: current directory is not a valaa repository; "
        + "package.json does not have valaa section, or valaa.type or valaa.domain settings"
        + "(maybe run 'vlm init'?)");
  }
  vlm.askToCreateValmaScriptSkeleton = askToCreateValmaScriptSkeleton;
  if (!yargv.moduleglob) {
    await vlm.callValma(`.configure/.modules`, yargv._.slice(1));
  }
  await vlm.callValma(`.configure/{,.type/.${valaa.type}/,.domain/.${valaa.type}/}.module/${
      yargv.moduleglob || ""}{*/**/,}*`);

  async function askToCreateValmaScriptSkeleton (script, scriptFile, briefText, summaryText,
        describeText) {
    const underscoredScript = script.replace(/\//g, "_");
    const command = script.replace("valma-", "");
    const scriptPath = `bin/${scriptFile}`;
    let verb = "already exports";
    while (!(vlm.packageConfig.bin || {})[underscoredScript]) {
      const choices = ["Create", "skip"];
      if (describeText) choices.push("help");
      const answer = await vlm.inquire([{
        message: `Create a ${briefText} valma script template as package.json:bin["${
            underscoredScript}"] -> "${scriptPath}"?`,
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      if (answer.choice === "skip") {
        verb = "still doesn't export";
        break;
      }
      if (answer.choice === "help") {
        console.log(describeText);
        console.log(`This step creates a ${briefText} script template for this component\n`);
        continue;
      }
      shell.mkdir("-p", "bin");
      shell.ShellString(
`exports.command = "${command}";
exports.summary = "${summaryText || ""}";
exports.describe = \`\${exports.summary}.\n${describeText || ""}\`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
};
`).to(scriptPath);
      vlm.updatePackageConfig({ bin: { [underscoredScript]: scriptPath } });
      verb = "now exports";
    }
    if (vlm.verbosity >= 1) {
      console.log(`valma-configure inform: repository ${verb} valma command ${command}`);
    }
  }
};
