const shared = require("@valos/toolset-revealer/shared/webpack.config.js");
const path = require("path");

const valmaConfigRevealerSection = require(`${process.cwd()}/toolsets.json`)[
    "@valos/toolset-revealer"].webpack;
valmaConfigRevealerSection.output.path = path.posix.resolve(valmaConfigRevealerSection.output.path);

module.exports = {
  ...shared,
  ...valmaConfigRevealerSection,
  // Add overrides here
};
