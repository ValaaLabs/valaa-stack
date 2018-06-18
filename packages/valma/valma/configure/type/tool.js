exports.command = ".configure/.type/tool";
exports.summary = "Configure a Valma tool repository";
exports.describe = `${exports.summary}.
Tools are toolset implementation detail and like toolsets, tools can
also have associated configuration in the repository where their
toolset has been configured in use.

As implementation detail tools are hidden from toolset selection. Each
tool is associated with one toolset and their valma config is always
placed under this parent toolset valma config.

Other than this, toolset and tools .

The case for tools and toolsets separation comes from the release
deployment needs, where granular versioning and packaging allows for
more efficient and robust deployments.

A monolithic toolset with complex configurations and infrastructure
code with a naive deployment logic would trigger code deployments even
if only a single configuration flag changed. Developing efficient
deployment logic on the other hand is error prone and not robust.

Tool repositories allows splitting complex toolsets into separate
tools with different deployment logic. Infrastructure code which
changes rarily can be placed in tool repositorires with naive
deployment logic which relies on the tool version number only.
Frequently changing configs can be managed by the toolset repository
itself but even it can then use tool repositories to source in
commands and other resources to help with the deployment management.
`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  await vlm.askToCreateValmaScriptSkeleton(
      `.valma-configure/.tool/${vlm.packageConfig.name}`,
      `valma-configure__${vlm.packageConfig.name.match(/([^/]*)$/)[1]}.js`,
      "tool configure",
      `Configure the depended tool ${vlm.packageConfig.name} for the current repository`,
`As a tool this script is not automatically called. The toolset or
tool which directly depends on this tool must explicit call this
command.
`);

  return yargv.vlm.callValma(`.configure/.type/.tool/**/*`);
};
