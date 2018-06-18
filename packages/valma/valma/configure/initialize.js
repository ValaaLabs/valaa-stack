exports.command = ".configure/.initialize";
exports.summary = "Initialize valaa repository type and domain from available options";
exports.describe = `${exports.summary}. Type determines the function and structure of the${
    ""} repository. Domain describes the higher level role of this repository. Both affect${
    ""} the available toolsets for the repository.`;

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
      interactive: { type: "list", when: vlm.reconfigure ? "always" : "if-undefined" },
      description: "package.json:valaa.type",
    },
    domain: {
      type: "string", default: valaa.domain, choices: domainChoices,
      interactive: { type: "list", when: vlm.reconfigure ? "always" : "if-undefined" },
      description: "package.json:valaa.domain",
    },
  });
};

exports.handler = (yargv) => yargv.vlm.updatePackageConfig({
  valaa: {
    type: yargv.type,
    domain: yargv.domain,
  },
});
