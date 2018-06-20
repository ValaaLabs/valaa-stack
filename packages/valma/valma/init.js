#!/usr/bin/env vlm

exports.command = "init";
exports.summary = "Initialize the current directory as a Valaa repository from scratch";
exports.describe = `${exports.summary}.

This process will walk you through creating and configuring a new
valma repository in the current working directory from scratch.

Valma init has following interactive phases:
1. Initialization of package.json via 'yarn init'
2. Initialization of repository valaa type and domain
3. Addition of new known workshops via 'yarn add --dev'
4. Selection of in-use toolsets from those listed in the workshops
5. Configuration of in-use toolsets and tools via 'vlm configure'`;

exports.disabled = (yargs) => ((yargs.vlm || {}).packageConfig || {}).valaa;
exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  vlm.echo = true;
  console.log(exports.describe.match(/[^\n]*\n(.*)/)[1]);

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
            ? "Reconfigure the existing package.json with 'yarn init'?"
            : "Initialize the package.json with 'yarn init'?",
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        console.log();
        console.log(
`This phase uses 'yarn init' to initialize package.json via a series of
interactive questions.
Valaa repositories use yarn extensively for version, dependency and
script management; package.json is the central package configuration
file for yarn (and for npm, for which yarn is an analogue).
`);
        continue;
      }
      if (answer.choice === "Skip") {
        console.log("Skipped 'yarn init'.");
        break;
      }
      await vlm.execute("yarn", ["init"]);
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
        message:
            justConfigured
                ? `Confirm selection or reconfigure: ${
                    JSON.stringify({ ...vlm.packageConfig.valaa })}?`
            : vlm.packageConfig.valaa
                ? `Reconfigure repository valaa stanza: ${
                    JSON.stringify({ ...vlm.packageConfig.valaa })}?`
            : "Initialize repository valaa type and domain?",
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      justConfigured = false;
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        console.log();
        await vlm.invoke(".configure/.initialize", ["--show-describe"]);
        console.log();
        continue;
      }
      if (answer.choice === "Confirm") break;
      if (answer.choice === "Skip") {
        console.log("Skipped repository valaa type and domain reconfigure.");
        return true;
      }
      vlm.reconfigure = true;
      await vlm.invoke(".configure/.initialize");
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
            ? "Retry adding workshops (or direct toolsets) as devDependencies?"
            : vlm.packageConfig.devDependencies
                ? "Add more workshops (or direct toolsets) as devDependencies?"
                : "Add initial workshops (or direct toolsets) as devDependencies?",
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      wasError = false;
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        console.log();
        console.log(
`This phase uses 'yarn add --dev' to add workshops as devDependencies.
This allows the toolsets in those workshops to be available for the
following configure phase.
`);
        continue;
      }
      if (answer.choice === "Skip") break;
      if (answer.choice === "skip") {
        console.log("Skipped 'yarn add --dev'.");
        break;
      }
      answer = await vlm.inquire([{
        type: "input", name: "devDependencies",
        message: "enter a space-separated list of workshops for 'yarn add --dev':\n",
      }]);
      if (!answer || !answer.devDependencies) {
        console.log("No devDependencies provided, skipping 'yarn add --dev' phase");
      } else {
        try {
          await vlm.execute("yarn",
              ["add", "--dev"].concat(answer.devDependencies.split(" ")));
        } catch (error) {
          console.log();
          console.error(`An exception caught during external command 'yarn add --dev ${
              answer.devDependencies}':\n`, error);
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
        await vlm.invoke("configure", ["--info"]);
        console.log();
        continue;
      }
      if (answer.choice === "Skip") {
        console.log("Skipped 'vlm configure'.");
        break;
      }
      await vlm.invoke("configure");
      break;
    }
    return true;
  }
};
