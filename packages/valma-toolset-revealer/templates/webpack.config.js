const shared = require("@valos/valma-toolset-revealer/shared/webpack.config.js");
const path = require("path");

const valmaConfigRevealerSection = require(`${process.cwd()}/valma.json`)
    .toolset["@valos/valma-toolset-revealer"].webpack;
valmaConfigRevealerSection.output.path = path.posix.resolve(valmaConfigRevealerSection.output.path);

module.exports = {
  ...shared,
  ...valmaConfigRevealerSection,
  // Add overrides here
};
