exports.command = ".configure/.modules";
exports.summary = "Enable and disable valma modules from the pool of available modules";
exports.describe = `${exports.summary}. The set of available modules is those matching the glob${
    ""} '.configure/{,.type/.<type>/,.domain/.<domain>/}.module/**/*' (note the empty selector)`;

exports.builder = (yargs) => {
  const valaa = yargs.vlm.packageConfig.valaa;
  if (!valaa || !valaa.type || !valaa.domain) return undefined;
  const valmaConfig = yargs.vlm.valmaConfig;
  if (!valmaConfig) {
    throw new Error(".valma-configure/.modules: current directory is not a valma repository; "
        + "valma.json missing (maybe run 'vlm init'?)");
  }
  const availableScripts = yargs.vlm.listMatchingCommands(
          `.configure/{,.type/.${valaa.type}/,.domain/.${valaa.domain}/}.module/**/*`);
  const availableModules = availableScripts.map(n => n.match(/\/.module\/(.*)$/)[1]);
  const selectedModules = Object.keys(valmaConfig.module || {}).filter(k => valmaConfig.module[k]);
  return yargs.options({
    select: {
      type: "string", default: selectedModules,
      choices: availableModules.concat(selectedModules.filter(m => !availableModules.includes(m))),
      interactive: { type: "checkbox", when: "always" },
      description: "toggle active modules",
    },
  });
};

exports.handler = (yargv) => {
  const valmaConfig = yargv.vlm.valmaConfig;
  if (!valmaConfig) return;

  const activeModules = valmaConfig.module || {};
  const module = {};

  const disableModules = Object.keys(activeModules).filter(n => !yargv.select.includes(n));
  // TODO: add confirmation for configurations that are about to be eliminated with null
  disableModules.forEach(n => { module[n] = null; });
  const enableModules = yargv.select.filter(n => !activeModules[n]);
  enableModules.forEach(n => { module[n] = {}; });

  yargv.vlm.updateValmaConfig({ module });
};
