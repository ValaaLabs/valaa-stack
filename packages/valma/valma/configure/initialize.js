exports.command = ".configure/.initialize";
exports.summary = "Initialize valaa repository type and domain from available options";
exports.describe = `${exports.summary}.

Type determines the localized role and structure of this repository.
Domain defines the context and the overall purpose of this repository.
Both affect the available toolsets for the repository.`;

exports.builder = (yargs) => {
  const vlm = yargs.vlm;
  const valaa = vlm.packageConfig.valaa || {};
  const typeChoices = vlm.listMatchingCommands(".configure/.type/*")
      .map(n => n.match(/^.configure\/.type\/([^/]*)/)[1])
      .concat("<custom>");
  const domainChoices = vlm.listMatchingCommands(".configure/.domain/*")
      .map(n => n.match(/^.configure\/.domain\/([^/]*)/)[1])
      .concat("<custom>");
  return yargs.options({
    type: {
      type: "string", default: valaa.type, choices: typeChoices,
      interactive: {
        type: "list", when: vlm.reconfigure ? "always" : "if-undefined", pageSize: 10,
        confirm: _inquireIfCustomThenAlwaysConfirm.bind(null, vlm, "type"),
      },
      description: "Select repository package.json stanza valaa.type",
    },
    domain: {
      type: "string", default: valaa.domain, choices: domainChoices,
      interactive: {
        type: "list", when: vlm.reconfigure ? "always" : "if-undefined", pageSize: 10,
        confirm: _inquireIfCustomThenAlwaysConfirm.bind(null, vlm, "domain"),
      },
      description: "Select repository package.json stanza valaa.domain",
    },
  });
};

async function _inquireIfCustomThenAlwaysConfirm (vlm, category, selection, answers) {
  if (selection === "<custom>") {
    answers[category] = await vlm.inquireText(`Enter custom valaa.${category}:`);
  }
  await vlm.invoke(`.configure/.${category}/${answers[category]}`, ["--show-describe"]);
  return await vlm.inquireConfirm(`Confirm valaa.${category} selection: '${answers[category]}'?`);
}

exports.handler = (yargv) => yargv.vlm.updatePackageConfig({
  valaa: {
    type: yargv.type,
    domain: yargv.domain,
  },
});
