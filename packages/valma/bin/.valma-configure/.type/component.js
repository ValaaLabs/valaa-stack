exports.command = ".configure/.type/component";
exports.summary = "Configure a Valma component repository";
exports.describe = `${exports.summary}. Valma components are used as dependencies for valma${
    ""} modules. Components are implementation detail building blocks of the modules; they${
    ""} provide a way to have separate version tracking from the module itself. As an${
    ""} implementation detail components don't appear in listings (they are known and called by${
    ""} their parent modules directly).`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  await vlm.askToCreateValmaScriptSkeleton(
      `.valma-configure/.component/${vlm.packageConfig.name}`,
      "valma-configure_component.js",
      "component configure",
      `Configure the depended component ${vlm.packageConfig.name} for the current repository`,
`As a component this script is not automatically called. The module or
component which directly depends on this component must explicit call
this script.
`);

  return yargv.vlm.callValma(`.configure/.type/.component/**/*`);
}
