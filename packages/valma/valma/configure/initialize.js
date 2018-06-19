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
      .map(n => n.match(/^.configure\/.type\/([^/]*)/)[1]);
  const domainChoices = vlm.listMatchingCommands(".configure/.domain/*")
      .map(n => n.match(/^.configure\/.domain\/([^/]*)/)[1]);
  return yargs.options({
    type: {
      type: "string", default: valaa.type, choices: typeChoices,
      interactive: {
        type: "list", when: vlm.reconfigure ? "always" : "if-undefined",
        confirm: async (selection) => {
          await vlm.invoke(`.configure/.type/${selection}`, ["--show-describe"]);
          return await vlm.inquireConfirm(`Confirm valaa.type selection: '${selection}'?`);
        }
      },
      description: "Select repository package.json stanza valaa.type",
    },
    domain: {
      type: "string", default: valaa.domain, choices: domainChoices,
      interactive: {
        type: "list", when: vlm.reconfigure ? "always" : "if-undefined",
        confirm: async (selection) => {
          await vlm.invoke(`.configure/.domain/${selection}`, ["--show-describe"]);
          return await vlm.inquireConfirm(`Confirm valaa.domain selection: '${selection}'?`);
        }
      },
      description: "Select repository package.json stanza valaa.domain",
    },
  });
};

exports.handler = (yargv) => yargv.vlm.updatePackageConfig({
  valaa: {
    type: yargv.type,
    domain: yargv.domain,
  },
});
