#!/usr/bin/env vlm

exports.command = "package-publish";
exports.describe = "Publish package assemblies to their registries";
exports.introduction = `${exports.describe}.`;

exports.builder = (yargs) => yargs.options({
  source: {
    type: "string", default: "dist/packages",
    description: `Source directory for the package assemblies that are to be published.`
  },
  "delete-published": {
    type: "boolean", default: true,
    description: `Delete successfully published package assemblies.`,
  },
  publisher: {
    type: "string", default: "npm",
    description: `The command used to publish individual packages assemblies.`,
  },
});

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  const assemblyGlobs = yargv._.length > 1 ? yargv._.slice(1) : [""];
  const assemblyPaths = assemblyGlobs.reduce((paths, glob) => {
    const pathListing = vlm.shell.find(vlm.path.join(
        yargv.source, !glob ? "**" : vlm.path.join("**", glob, "**"), "package.json"));
    return pathListing.code ? paths : paths.concat(
        ...pathListing.map(p => !p.includes("node_modules") && p.match(/(.*)\/package.json/)[1])
            .filter(p => p && !paths.includes(p)));
  }, []);
  if (yargv.publisher) {
    const nameRegex = new RegExp(`^${yargv.source}/(.*)$`);
    vlm.info(`Publishing ${assemblyPaths.length} package assemblies (via globs '${
            assemblyGlobs.join("', '")}') using '${yargv.publisher}':\n\t`,
        ...assemblyPaths.map(p => p.match(nameRegex)[1]));
    for (const packagePath of assemblyPaths) {
      const publishResult = vlm.shell.exec(`${yargv.publisher} publish ${packagePath}`);
      if (!publishResult.code && packagePath) {
        vlm.info(`Successfully published with '${yargv.publisher} publish ${packagePath}'`);
        if (yargv.deletePublished) {
          vlm.info("\tremoving the package assembly");
          vlm.shell.rm("-rf", packagePath);
        }
      } else {
        vlm.error(`Error during '${yargv.publisher} publish ${packagePath}':`,
            publishResult.code, publishResult);
      }
    }
  }
};
