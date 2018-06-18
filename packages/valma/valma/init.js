#!/usr/bin/env vlm

exports.command = "init";
exports.summary = "Initialize the current directory as a Valaa repository from scratch";
exports.describe = `${exports.summary}.`;

exports.disabled = (yargs) => ((yargs.vlm || {}).packageConfig || {}).valaa;
exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  vlm.echo = true;
  console.log("This tool will walk you through creating and configuring a new valma repository",
      "in the current working directory.");
  console.log();

  return await _configurePackageJSON()
      && await _configureValaaTypeAndDomain()
      && await _addInitialValmaDevDependencies()
      && await _configureValmaConfig();

  async function _configurePackageJSON () {
    for (;;) {
      const choices = (vlm.packageConfig ? ["Skip", "reconfigure"] : ["Initialize"])
          .concat(["help", "quit"]);
      const answer = await vlm.inquire([{
        message: vlm.packageConfig
            ? "Reconfigure the existing root package.json with 'yarn init'?"
            : "Initialize the root package.json with 'yarn init'?",
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        console.log();
        console.log("Valaa repositories use yarn extensively for version, dependency and script");
        console.log("management; package.json is the central yarn configuration file. 'yarn init'");
        console.log("will initialize it.");
        console.log();
        continue;
      }
      if (answer.choice === "Skip") {
        console.log("Skipped 'yarn init'.");
        break;
      }
      await vlm.executeScript("yarn", ["init"]);
      break;
    }
    return true;
  }

  async function _configureValaaTypeAndDomain () {
    let justConfigured = false;
    for (;;) {
      const choices = (justConfigured ? ["Confirm", "reconfigure"]
              : vlm.packageConfig.valaa ? ["Skip", "reconfigure"] : ["Initialize"])
          .concat(["help", "quit"]);
      const answer = await vlm.inquire([{
        message: justConfigured
                ? "Confirm selection or reconfigure repository Valaa type and domain?"
            : vlm.packageConfig.valaa ? "Reconfigure repository Valaa type and domain?"
            : "Initialize repository Valaa type and domain?",
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      justConfigured = false;
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        console.log();
        await vlm.callValma(".configure/.initialize", ["--info"]);
        console.log();
        continue;
      }
      if (answer.choice === "Confirm") break;
      if (answer.choice === "Skip") {
        console.log("Skipped repository valaa reconfigure.");
        return true;
      }
      vlm.reconfigure = true;
      await vlm.callValma(".configure/.initialize");
      console.log();
      console.log("You are selecting domain", vlm.packageConfig.valaa.domain, "with description:");
      await vlm.callValma(`.configure/.domain/${vlm.packageConfig.valaa.domain}`, ["--describe"]);
      console.log();
      console.log("You are selecting type", vlm.packageConfig.valaa.type, "with description:");
      await vlm.callValma(`.configure/.type/${vlm.packageConfig.valaa.type}`, ["--describe"]);
      justConfigured = true;
    }
    return true;
  }

  async function _addInitialValmaDevDependencies () {
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
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
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
        message: "enter a space-separated list of valma modules for 'yarn install --save-dev':\n",
      }]);
      if (!answer || !answer.devDependencies) {
        console.log("no devDependencies provided, skipping 'yarn install --save-dev'");
      } else {
        try {
          await vlm.executeScript("yarn",
              ["install", "--save-dev"].concat(answer.devDependencies.split(" ")));
        } catch (error) {
          console.log();
          console.error(`An exception caught during external command 'yarn install --save-dev ${
              answer.devDependencies}':`, error);
          wasError = true;
        }
      }
    }
    return true;
  }

  async function _configureValmaConfig () {
    for (;;) {
      const choices = (vlm.valmaConfig ? ["Skip", "reconfigure"] : ["Initialize"])
          .concat(["help", "quit"]);
      const answer = await vlm.inquire([{
        message: vlm.valmaConfig
            ? "Reconfigure repository valma config with 'vlm configure'?"
            : "Initialize repository valma config with 'vlm configure'?",
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        console.log();
        await vlm.callValma("configure", ["--info"]);
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
    return true;
  }
};
