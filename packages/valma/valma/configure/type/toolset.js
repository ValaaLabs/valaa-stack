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

exports.disabled = (yargs) => !(yargs.vlm.packageConfig || {}).valaa;
exports.builder = (yargs) => yargs.options({
  "repository-type": {
    type: "string",
    description: `Limit this toolset to repositories with this valaa type (empty "" for no limit).`,
    default: yargs.vlm.packageConfig.valaa.domain,
    interactive: { type: "input", when: true ? "always" : "if-undefined" },
  },
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const repositoryTypeGlob = yargv.repositoryType ? `.type/.${yargv.repositoryType}/` : "";
  await vlm.askToCreateValmaScriptSkeleton(
      `.valma-configure/${repositoryTypeGlob}${vlm.packageConfig.name}`,
      "configure__toolset.js", {
        brief: "toolset configure",
        summary: `Configure the toolset ${vlm.packageConfig.name} for the current repository`,

        describe: repositoryTypeGlob
            ?
`This script is called when a repository with valaa type equal to
'${yargv.repositoryType}' is configured.`
            :
`This script is called when any repository depending on this toolset is
configured.`,
      });

  return yargv.vlm.invoke(`.configure/.type/.toolset/**/*`);
};
