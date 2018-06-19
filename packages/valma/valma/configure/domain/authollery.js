exports.command = ".configure/.domain/authollery";
exports.summary = "Configure a valaa repository to be part of the authollery domain";
exports.describe = `${exports.summary}.

Authollery domain includes all toolsets which are meant to be
dev-depended by autholleries. The purpose of autholleries is to have
a centralized, configurable, granular and versioned system for building
and deploying releases.

A release deployment is the process of making changes to a live remote
system. A deployment can modify external infrastructure code, update
configurations and upload new file content to the targeted live system.

Ideally each deployment would be fully atomic but as autholleries are
designed to be used against arbitrary systems this is often not
feasible. To overcome this limitation and still maintain consistency
following strategy is used:

1. the release process is divided to two stages which are separately
   initiated by valma commands 'release-build' and 'release-deploy'.
   This separation is to ensure eventual completion of deployments and
   importantly to facilitate the understanding of particular authollery
   release deployment process by allowing a DevOps to inspect and test
   the intermediate release build locally even if everything is fine.
2. The output of the 'release-build' stage is the release itself:
   an isolated set of files in a local directory (usually
   'dist/release/<version>'). These release files contain the diff-sets
   which the 'release-deploy' consumes. The release files are intended
   to be perused and understood by DevOps.
4. The release is divided into atomic, versioned sub-releases to ensure
   consistency during each point during the full deployment.
   Sub-releases have their own versions and can have (non-cyclic)
   dependencies to each other.
5. A single sub-release is typically created by a single valma toolset
   or tool with its own customized release-build detail commands.
6. release-build detail commands evaluate the local authollery
   modifications and compares them to the actually deployed state. This
   difference is used to construct the minimal set of atomic, locally
   persisted, individually versioned sub-releases.
7. release-deploy stage deploy each sub-release and ensures that
   a deployment for all dependents complete before their depending
   deployments are initiated.`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const valaa = (vlm.packageConfig || {}).valaa;
  const isToolset = (valaa.type === "toolset");
  const name = vlm.packageConfig.name;
  const shortName = /([^/]*)$/.exec(name)[1];
  if (isToolset || (valaa.type === "tool")) {
    await vlm.askToCreateValmaScriptSkeleton(
        `.valma-release-build/${isToolset ? "" : ".tool/"}${name}`,
        `release-build__${shortName}.js`, {
          brief: `${valaa.type} sub-release build`,
          header: `const ${valaa.type}Name = "${name}";\n\n`,
          summary: `Build a sub-release of the ${valaa.type} ${name}`,

          builder: isToolset ? undefined :
`(yargs) => yargs.options({
  toolset: {
    type: "string", default: yargs.vlm.toolset,
    description: "The toolset within which this tool should build a release.",
    interactive: {
      type: "input", when: "if-undefined",
      confirm: value => yargs.vlm.confirmToolsetExists(
          value, \`valma-release-build ${shortName}\`),
    },
  },
});`,
          describe: isToolset
              ?
`When a release is being built each active toolset must explicitly
invoke the build commands of all of its buildable tools.`
              :
`This tool sub-release build command must be explicitly invoked by
toolsets which use this tool.`,
          handler:
`async (yargv) => {
  const vlm = yargv.vlm;${isToolset ? "" : `
  const toolsetName = yargv.toolset;`}
  const ${valaa.type}Version = await vlm.invoke(exports.command, ["--version"]);
  const { ${valaa.type}Config, ${valaa.type}ReleasePath } = vlm.prepareToolset${
      isToolset ? "" : "Tool"}Build(
      ${isToolset ? "" : "toolsetName, "}${valaa.type}Name, "${shortName}", ${valaa.type}Version);
  if (!${valaa.type}Config) return;

  vlm.shell.ShellString(${valaa.type}Version).to(vlm.path.join(${
      valaa.type}ReleasePath, "version-hash"));
  return;
};
`,
        });

    await vlm.askToCreateValmaScriptSkeleton(
        `.valma-release-deploy/${isToolset ? "" : ".tool/"}${name}`,
        `release-deploy__${shortName}.js`, {
          brief: `${valaa.type} sub-release deploy`,
          header: `const ${valaa.type}Name = "${name}";\n\n`,
          summary: `Deploy the sub-release of the ${valaa.type} ${name}`,

          builder: isToolset ? undefined :
`(yargs) => yargs.options({
  toolset: {
    type: "string", default: yargs.vlm.toolset,
    description: "The toolset from within which this tool should deploy a release.",
    interactive: {
      type: "input", when: "if-undefined",
      confirm: value => yargs.vlm.confirmToolsetExists(
          value, \`valma-release-deploy ${shortName}\`),
    },
  },
});`,
          describe: isToolset
              ?
`When a release is being deployed each active toolset must explicitly
invoke the deploy commands of all of its deployable tools.`
              :
`This tool sub-release deploy command must be explicitly invoked by
toolsets which use this tool.`,
          handler:
`async (yargv) => {
  const vlm = yargv.vlm;${isToolset ? "" : `
  const toolsetName = yargv.toolset;`}
  const { ${valaa.type}Config, ${valaa.type}ReleasePath } = vlm.locateToolset${
      isToolset ? "" : "Tool"}Release(
      ${isToolset ? "" : "toolsetName, "}${valaa.type}Name, "${shortName}");
  if (!${valaa.type}ReleasePath) return;

  const deployedVersionHash = await vlm.readFile(vlm.path.join(${
      valaa.type}ReleasePath, "version-hash"));
  const toolsetConfigUpdate = { ${isToolset
      ? "deployedVersionHash"
      : `tool: { [toolName]: { deployedVersionHash } }`
  } };
  vlm.updateValmaConfig({ toolset: { [toolsetName]: toolsetConfigUpdate } });
  return;
};
`,
        });
  }
  return vlm.invoke(`.configure/.domain/.authollery/**/*`);
};
