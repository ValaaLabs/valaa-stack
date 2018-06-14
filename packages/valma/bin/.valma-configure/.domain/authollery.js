exports.command = ".configure/.domain/authollery";
exports.summary = "Configure a valaa repository to be part of the authollery domain";
exports.describe = `${exports.summary}.
This includes components and modules meant to be dev-depended by autholleries.
The central authollery concept is versioned building and deploying releases.
A release deployment is the process of making changes to a remote system,
during which external code can be modified, configurations can be updated and
new file content can uploaded to live infrastructure systems.

Ideally each deployment would be fully atomic, but as autholleries are designed
to be used against arbitrary systems this is often not feasible. To overcome
this limitation and still maintain consistency following strategy is used:

1. the release process is divided to two stages which are separately initiated
   by valma commands 'release-build' and 'release-deploy'.
   This separation is to ensure eventual completion of deployments and equally
   importantly to facilitate easier diagnostics and understanding of the
   process details for DevOps.
2. The output of the 'release-build' stage is the release itself: an isolated
   set of files in a local directory, usually "dist/release/<version>". These
   release files contain the diff-sets which the 'release-deploy' consumes.
   The release files are intended to be perused and understood by DevOps.
4. The release is divided into atomic, versioned sub-releases with to ensure
   consistency during each point during the full deployment. Sub-releases have
   their own versions and can have (non-cyclic) dependencies to each other.
5. A single sub-release is typically created by a single valma module/component
   (with authollery as its domain) by the release-build detail command scripts.
6. release-build scripts evaluate the local authollery modifications and
   compares them to the actually deployed state. This difference is used to
   construct the minimal set of atomic, locally persisted, individually
   versioned sub-releases.
7. release-deploy stage deploy each sub-release and ensures that a deployment
   for all dependents complete before their depender deploys are initiated.
`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const valaa = (vlm.packageConfig || {}).valaa;
  const isModule = (valaa.type === "module");
  const name = vlm.packageConfig.name;
  const shortName = /([^/]*)$/.exec(name)[1];
  if (isModule || (valaa.type === "component")) {
    await vlm.askToCreateValmaScriptSkeleton(
        `.valma-release-build/${isModule ? "" : ".component/"}${name}`,
        `valma-release-build__${shortName}.js`,
        `${valaa.type} sub-release build`,
        `Build a sub-release of the ${valaa.type} ${name}.`,
        isModule ? `` :
`When the current repository is building a release, each module shall
explicitly call the build scripts of each of its buildable components.`);

    await vlm.askToCreateValmaScriptSkeleton(
        `.valma-release-deploy/${isModule ? "" : ".component/"}${name}`,
        `valma-release-deploy__${shortName}.js`,
        `${valaa.type} sub-release deploy`,
        `Deploy the pre-built sub-release of the ${valaa.type} ${name}.`,
        isModule ? `` :
`When the current repository is deploying a release, each module shall
explicitly call the deploy scripts of each of its deployable components.`);
  }

  return vlm.callValma(`.configure/.domain/.authollery/**/*`);
};
