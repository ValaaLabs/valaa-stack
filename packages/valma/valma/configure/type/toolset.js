exports.command = ".configure/.type/toolset";
exports.summary = "Configure a Valma toolset repository";
exports.describe = `${exports.summary}.

A valma toolset is a package which provides various resources for
a depending repository with the ability to have repository specific
configurations in their 'valma.json'.
These resources might be new valma commands, file templates,
dependencies to other valma toolsets and tools, to external tools or
to plain javascript libraries; anything that can be expressed in a
package really.

The defining quality of a toolset is its ability to have repository
specific configuration which all toolset commands and even other
javascript files can access to customize their behaviour. Additionally
toolsets appear in configuration listings and can be selectively
enabled or disabled on a repository.

A valma toolsets are added as regular devDependencies and configured
by running 'vlm configure' afterwards.`;

exports.disabled = (yargs) => !yargs.vlm.getPackageConfig("valaa");
exports.builder = (yargs) => yargs.options({
  restrict: {
    type: "string",
    description: `Restrict this toolset to a valaa type (clear for no restriction):`,
    default: yargs.vlm.packageConfig.valaa.domain,
    interactive: { type: "input", when: true ? "always" : "if-undefined" },
  },
  grabbable: {
    description: `Make this toolset grabbable and stowable (falsy for always-on):`,
    default: true,
    interactive: { type: "input", when: true ? "always" : "if-undefined" },
  },
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const simpleName = vlm.packageConfig.name.match(/([^/]*)$/)[1];
  await vlm.invoke("create-command", [{
    command: `.configure/${yargv.restrict ? `.type/.${yargv.restrict}/` : ""}${
        yargv.grabbable ? ".toolset/" : ""}${vlm.packageConfig.name}`,
    filename: `configure__${yargv.restrict ? yargv.restrict : ""}${
        yargv.grabbable ? "_toolset_" : "_"}_${simpleName}.js`,
    export: true, skeleton: true,
    brief: "toolset configure",
    summary: `Configure the toolset '${simpleName}' for the current ${
        yargv.restrict || "repository"}`,

    describe: yargv.restrict
        ?
`This script makes the toolset '${simpleName}' available for
grabbing by repositories with valaa type '${yargv.restrict}'.`
        :
`This script makes the toolset ${simpleName} available for
grabbing by all repositories.`,
  }]);
  return yargv.vlm.invoke(`.configure/.type/.toolset/**/*`);
};
