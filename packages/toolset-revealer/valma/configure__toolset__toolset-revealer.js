const toolsetName = "@valos/toolset-revealer";

exports.command = ".configure/.toolset/@valos/toolset-revealer";
exports.summary = "Configure this repository for webpack revelation bundling with toolset-revealer";
exports.describe = `${exports.summary}.

Adds valma command 'revealer-dev-server'.

Sets up the webpack entry and output config as webpack.config.js in
the repository root, which combines shared revealer config from
@valos/toolset-revealer/shared/webpack.config.js, local toolset config
and any customizations in the root webpack.config.js itself.`;

// Example template which displays the command name itself and package name where it is ran
// Only enabled inside package
exports.disabled = (yargs) => !yargs.vlm.packageConfig || !yargs.vlm.getToolsetConfig(toolsetName);
exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const toolsetConfig = vlm.getToolsetConfig(toolsetName);
  const templates = vlm.path.join(__dirname, "../templates/{.,}*");
  vlm.info("Copying revealer template files from ", templates, "(will not clobber existing files)");
  vlm.shell.cp("-n", templates, ".");
  vlm.instruct("! Edit webpack.config.js to configure webpack entry and output locations.");
  if (!toolsetConfig.webpack) {
    vlm.updateToolsetConfig(toolsetName, {
      "webpack": {
        "entry": { "valaa-inspire": "./node_modules/@valos/inspire/index.js" },
        "output": {
          "path": "dist/revealer/valaa/inspire/",
          "publicPath": "/valaa/inspire/",
          "filename": "[name].js"
        }
      }
    });
    vlm.instruct(`! Edit valma.json:toolset["${toolsetName
        }"].webpack to further configure webpack entry and output locations.`);
  }
  return true;
};
