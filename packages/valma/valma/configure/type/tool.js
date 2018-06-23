exports.command = ".configure/.type/tool";
exports.summary = "Configure a Valma tool repository";
exports.describe = `${exports.summary}.

Tools are a toolset implementation detail. A tool is similar to
a toolset in that it can have its own repository specific
configurations. A tool differs from a toolset in that it cannot be
standalone; it doesn't appear in listings, its always part of one or
more toolsets and its valma.json config stanzas are placed under
its parent toolset stanzas.

The main case for tools and toolsets separation came from the release
deployment system of autholleries, where the modularity and granular
semantic versioning of tool packages allows for more efficient and
robust deployments.

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

Additionally because the tool configuration is always inside its
parent toolset config this allows the same tool be used by several
different toolsets in a single repository. Because of this all tool
commands must accept '--toolset=@myscope/mytoolset' with vlm.toolset as
default value.`;

exports.builder = (yargs) => yargs.options({
  brief: {
    type: "string", description: "A brief two-three word description of this tool",
  },
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  await vlm.askToCreateValmaScriptSkeleton(
      `.valma-configure/.tool/${vlm.packageConfig.name}`,
      `configure__${vlm.packageConfig.name.match(/([^/]*)$/)[1]}.js`, {
        brief: `${yargv.brief || "simple"} configure`,
        header: `const toolName = "${vlm.packageConfig.name}";\n`,
        summary: `Configure this tool package within the given toolset configuration`,

        describe:
`As a tool this script is not automatically called. The toolset or tool
which directly depends on this tool must explicit call this command.`,

        builder: `(yargs) => yargs.options({
  toolset: {
    type: "string", default: yargs.vlm.toolset,
    description: "The toolset for which this tool should be configured.",
    interactive: {
      type: "input", when: "if-undefined",
      confirm: value => yargs.vlm.confirmToolsetExists(value),
    },
  },
});`,
        handler: `(yargv) => {
  const vlm = yargv.vlm;
  const toolConfig = vlm.tryGetToolsetToolConfig(yargv.toolset, toolName) || {};
  // Construct a tool config update or bail out.
  const configUpdate = {};
  vlm.updateValmaConfig({ toolset: { [yargv.toolset]: { tool: { [toolName]: configUpdate } } } });
};
`,
      });
  return yargv.vlm.invoke(`.configure/.type/.tool/**/*`);
};
