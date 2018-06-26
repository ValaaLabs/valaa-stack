exports.command = ".configure/.toolsets";
exports.summary = "Grab and stow toolsets from the set available toolsets";
exports.describe = `${exports.summary}.

The set of available toolsets is defined by the set of all valma
'toolset configure' commands listed by the invokation (note the empty
  selector):

vlm -da '.configure/{,.type/.<type>/,.domain/.<domain>/}.toolset/**/*'

An invokation 'vlm configure' will invoke these toolset configure
command for all toolsets that are selected to be in use.

Toolsets are usually sourced via depending on workshop packages.
Toolsets from file and global pools can be used but should be avoided
as such toolsets are not guaranteed to be always available.`;

exports.disabled = (yargs) => {
  const valaa = ((yargs.vlm || {}).packageConfig || {}).valaa;
  return !valaa || !valaa.type || !valaa.domain || !yargs.vlm.valmaConfig;
};
exports.builder = (yargs) => {
  const valmaConfig = yargs.vlm.valmaConfig;
  if (!valmaConfig) throw new Error("valma.json missing (maybe run 'vlm init'?)");
  if (this.disabled(yargs)) throw new Error("package.json missing stanza .valaa.type/.domain");
  const valaa = yargs.vlm.packageConfig.valaa;
  const valmaToolsets = yargs.vlm
      .listMatchingCommands(
          `.configure/{,.type/.${valaa.type}/,.domain/.${valaa.domain}/}.toolset/**/*`)
      .map(n => n.match(/\/.toolset\/(.*)$/)[1]);
  const configuredToolsets = Object.keys(valmaConfig.toolset || {});
  const usedToolsets = configuredToolsets
      .filter(name => (valmaConfig.toolset[name] || {})["in-use"]);
  const allToolsets = valmaToolsets.concat(
      configuredToolsets.filter(toolset => !valmaToolsets.includes(toolset)));
  return yargs.options({
    toolsets: {
      type: "string", default: usedToolsets, choices: allToolsets,
      interactive: { type: "checkbox", when: "always" },
      description:
          "Grab toolsets to use from the available toolsets (check to grab, uncheck to stow)",
    },
  });
};

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const valmaConfig = vlm.valmaConfig;
  if (!valmaConfig) return;

  const configuredToolsets = valmaConfig.toolset || {};
  const newToolsets = yargv.toolsets || [];
  const toolset = {};
  const ret = {};

  const stowToolsets = Object.keys(configuredToolsets)
      .filter(n => (!newToolsets.includes(n) && !configuredToolsets[n]["in-use"]));
  // TODO: add confirmation for configurations that are about to be eliminated with null
  if (stowToolsets.length) {
    vlm.info(`Stowing toolsets:`, ...stowToolsets);
    stowToolsets.forEach(n => { toolset[n] = { ["in-use"]: false }; });
    ret.stowed = stowToolsets;
  }
  const grabToolsets = newToolsets
      .filter(n => (configuredToolsets[n] || { ["in-use"]: true })["in-use"]);
  if (grabToolsets.length) {
    vlm.info(`Grabbing toolsets:`, ...grabToolsets);
    const installAsDevDeps = grabToolsets
        .filter(toolsetName => !(vlm.packageConfig.devDependencies || {})[toolsetName]);
    if (installAsDevDeps.length) {
      vlm.info(`Installing toolsets as direct dev-dependencies:`, installAsDevDeps);
      await vlm.execute("yarn", ["add", "-W", "--dev", ...installAsDevDeps]);
    }
    grabToolsets.forEach(n => { toolset[n] = { ["in-use"]: true }; });
    ret.grabbed = grabToolsets;
  }
  await vlm.updateValmaConfig({ toolset });
  return ret;
};
