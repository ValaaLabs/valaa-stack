exports.command = "init";
exports.summary = "Initialize the current directory as a Valaa repository from scratch";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  vlm.echo = true;
  console.log("This tool will walk you through creating and configuring a new valma repository",
      "in the current working directory.");
  console.log();

  for (;;) {
    const choices = (vlm.packageConfig ? ["Skip", "reconfigure"] : ["Initialize"])
        .concat(["help", "quit"]);
    const answer = await vlm.inquire([{
      message: vlm.packageConfig
          ? "Reconfigure the existing root package.json with 'npm init'?"
          : "Initialize the root package.json with 'npm init'?",
      type: "list", name: "choice", default: choices[0], choices,
    }]);
    if (answer.choice === "quit") return;
    if (answer.choice === "help") {
      console.log();
      console.log("Valaa repositories use npm extensively for version, dependency and script");
      console.log("management; package.json is the central npm configuration file. 'npm init'");
      console.log("will initialize it.");
      console.log();
      continue;
    }
    if (answer.choice === "Skip") {
      console.log("Skipped 'npm init'.");
      break;
    }
    await vlm.executeExternal("npm", ["init"]);
    break;
  }

  let justConfigured = false;
  for (;;) {
    const choices = (justConfigured ? ["Carry on", "reconfigure"]
            : vlm.packageConfig.valaa ? ["Skip", "reconfigure"] : ["Initialize"])
        .concat(["help", "quit"]);
    const answer = await vlm.inquire([{
      message: justConfigured ? "Carry on to init or reconfigure repository Valaa type and domain?"
          : vlm.packageConfig.valaa ? "Reconfigure repository Valaa type and domain?"
          : "Initialize repository Valaa type and domain?",
      type: "list", name: "choice", default: choices[0], choices,
    }]);
    justConfigured = false;
    if (answer.choice === "quit") return;
    if (answer.choice === "help") {
      console.log();
      await vlm.callValma(".configure/.initialize", ["--describe"]);
      console.log();
      continue;
    }
    if (answer.choice === "Carry on") break;
    if (answer.choice === "Skip") {
      console.log("Skipped repository valaa reconfigure.");
      break;
    }
    vlm.reinitialize = true;
    await vlm.callValma(".configure/.initialize");
    console.log();
    console.log("You selected repository domain", vlm.packageConfig.valaa.domain, ":");
    await vlm.callValma(`.configure/.domain/${vlm.packageConfig.valaa.domain}`, ["--describe"]);
    console.log();
    console.log("You selected repository type", vlm.packageConfig.valaa.type, ":");
    await vlm.callValma(`.configure/.type/${vlm.packageConfig.valaa.type}`, ["--describe"]);
    justConfigured = true;
  }

  let wasError;
  for (;;) {
    const choices = vlm.packageConfig.devDependencies
        ? ["Skip", "yes", "help", "quit"]
        : ["Yes", "skip", "help", "quit"];
    let answer = await vlm.inquire([{
      message: wasError
          ? "Retry adding valma modules or module collections as devDependencies?"
          : vlm.packageConfig.devDependencies
              ? "Add more valma modules or module collections as devDependencies?"
              : "Add initial valma modules or module collections as devDependencies?",
      type: "list", name: "choice", default: choices[0], choices,
    }]);
    wasError = false;
    if (answer.choice === "quit") return;
    if (answer.choice === "help") {
      console.log();
      await vlm.callValma("", ["--describe"]);
      console.log();
      console.log();
      console.log("This valma-init step is a convenience step for adding an initial set of valma");
      console.log("modules as devDependencies. This makes the valma configure scripts of those");
      console.log("modules available for the next init step for this repository.");
      console.log();
      console.log("Providing a package which has several valma modules as its dependencies");
      console.log("(a 'module collection') is a convenient way to add many valma modules at once.");
      console.log();
      continue;
    }
    if (answer.choice === "Skip") break;
    if (answer.choice === "skip") {
      console.log("Skipped adding valma modules as devDependencies.");
      break;
    }
    answer = await vlm.inquire([{
      type: "input", name: "devDependencies",
      message: "enter a space-separated list of valma modules for 'npm install --save-dev':\n",
    }]);
    if (!answer || !answer.devDependencies) {
      console.log("no devDependencies provided, skipping 'npm install --save-dev'");
    } else {
      try {
        await vlm.executeExternal("npm",
        ["install", "--save-dev"].concat(answer.devDependencies.split(" ")));
      } catch (error) {
        console.log();
        console.error(`An exception caught while running external command 'npm install --save-dev ${
            answer.devDependencies}':`, error);
        wasError = true;
      }
    }
  }

  for (;;) {
    const choices = (vlm.valmaConfig ? ["Skip", "reconfigure"] : ["Initialize"])
        .concat(["help", "quit"]);
    const answer = await vlm.inquire([{
      message: vlm.valmaConfig
          ? "Reconfigure repository valma config with 'vlm configure'?"
          : "Initialize repository valma config with 'vlm configure'?",
      type: "list", name: "choice", default: choices[0], choices,
    }]);
    if (answer.choice === "quit") return;
    if (answer.choice === "help") {
      console.log();
      await vlm.callValma("configure", ["--describe"]);
      console.log();
      continue;
    }
    if (answer.choice === "Skip") {
      console.log("Skipped 'vlm configure'");
      break;
    }
    await vlm.callValma("configure");
    break;
  }
};
