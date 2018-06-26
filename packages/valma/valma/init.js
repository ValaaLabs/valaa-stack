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
  vlm.speak(exports.describe.match(/[^\n]*\n(.*)/)[1]);

  return await _configurePackageJSON()
      && await _configureValaaTypeAndDomain()
      && await _addInitialValmaDevDependencies()
      && await _configureValmaConfig();

  async function _configurePackageJSON () {
    for (;;) {
      const choices = (vlm.packageConfig ? ["Skip", "reconfigure"] : ["Initialize"])
          .concat(["help", "quit"]);
      const answer = await vlm.inquire([{
        message: `${vlm.packageConfig ? "Reconfigure the existing" : "Initialize"
            } package.json with 'yarn init'?`,
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        vlm.speak();
        vlm.info("repository initialization",
`This phase uses '${vlm.colors.executable("yarn init")}' to initialize package.json via a series of
interactive questions.
Valaa repositories use yarn extensively for version, dependency and
script management; package.json is the central package configuration
file for yarn (and for npm, for which yarn is an analogue).
`);
        continue;
      }
      if (answer.choice === "Skip") {
        vlm.info(`Skipped '${vlm.colors.executable("yarn init")}'.`);
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
        message: !vlm.packageConfig.valaa
            ? "Initialize repository valaa stanza type and domain?"
            : `${justConfigured ? "Confirm selection or reconfigure" : "Reconfigure"
                } valaa stanza: ${JSON.stringify({ ...vlm.packageConfig.valaa })}?`,
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      justConfigured = false;
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        vlm.speak();
        await vlm.invoke(".configure/.initialize", ["--show-describe"]);
        vlm.speak();
        continue;
      }
      if (answer.choice === "Confirm") break;
      if (answer.choice === "Skip") {
        vlm.info("Skipped repository valaa type and domain reconfigure.");
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
            : `${vlm.colors.command('yarn add')} ${vlm.packageConfig.devDependencies
                ? "more" : "initial"} workshops (or direct toolsets) as devDependencies?`,
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      wasError = false;
      const coloredYarnAdd = vlm.colors.command("yarn add --dev");
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        vlm.speak();
        vlm.info("workshop registration"
`This phase uses '${coloredYarnAdd}' to add workshops as devDependencies.
This makes the toolsets in those workshops to be immediately available
for the listings in following phases.
`);
        continue;
      }
      if (answer.choice === "Skip") break;
      if (answer.choice === "skip") {
        vlm.info(`Skipped '${vlm.colors.executable("yarn add --dev")}'.`);
        break;
      }
      answer = await vlm.inquire([{
        type: "input", name: "devDependencies",
        message: `enter a space-separated list of workshops for '${coloredYarnAdd}':\n`,
      }]);
      if (!answer || !answer.devDependencies) {
        vlm.info(`No devDependencies provided, skipping workshop registration phase`);
      } else {
        try {
          await vlm.execute("yarn", ["add", "--dev"].concat(answer.devDependencies.split(" ")));
        } catch (error) {
          vlm.speak();
          vlm.exception(`An exception caught during external command '${
              vlm.colors.executable("yarn add --dev", answer.devDependencies)}':`, error);
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
        message: `${vlm.valmaConfig ? "Reconfigure" : "Initialize"} repository valma config with '${
            vlm.colors.command("vlm configure")}'?`,
        type: "list", name: "choice", default: choices[0], choices,
      }]);
      if (answer.choice === "quit") return false;
      if (answer.choice === "help") {
        vlm.speak();
        await vlm.invoke("configure", ["--show-describe"]);
        vlm.speak();
        continue;
      }
      if (answer.choice === "Skip") {
        vlm.info("Skipped 'vlm configure'.");
        break;
      }
      await vlm.invoke("configure");
      break;
    }
    return true;
  }
};
