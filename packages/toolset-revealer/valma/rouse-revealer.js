#!/usr/bin/env vlm

const defaultDistContentBase = "dist/revealer";
const defaultSource = "./revelations/";

exports.command = "rouse-revealer [distContentBase]";
exports.describe = "Launch a webpack-dev-server at localhost serving a local revelation";
exports.introduction = `${exports.describe}.

The revelation consists of two parts: webpack output and static files.
Webpack output is configured by the project root webpack.config.js and
the static files are served from the optionally given distContentBase
(default '${defaultDistContentBase}'). If this distContenBase path
doesn't exist it is created by copying all files from the directory
provided by --source (default ${defaultSource}).`;

exports.builder = function builder (yargs) {
  return yargs
      .option({
        source: {
          type: "string", default: "./revelations/",
          description: "The revelations source directory for populating an empty distContentBase",
        },
        host: {
          type: "string", default: "0.0.0.0",
          description: "The local ip where the server will be bound"
        },
        inline: {
          type: "boolean", default: true,
          description: "webpack-dev-server --inline option"
        },
        progress: {
          type: "boolean", default: true,
          description: "webpack-dev-server --progress option"
        },
        open: {
          type: "boolean", default: true,
          description: "webpack-dev-server --open option"
        },
      });
};
exports.handler = function handler (yargv) {
  const vlm = yargv.vlm;
  const contentBase = yargv.distContentBase || "dist/revealer";
  if (!vlm.shell.test("-d", contentBase)) {
    vlm.info("Creating and populating an initially missing content base directory",
        contentBase, `(for this first time only) from ${yargv.source}`);
    vlm.shell.mkdir("-p", contentBase);
    vlm.shell.cp("-R", vlm.path.join(yargv.source, "*"), contentBase);
  }
  return vlm.execute("webpack-dev-server", [
    yargv.inline && "--inline",
    yargv.progress && "--progress",
    yargv.open && "--open",
    "--host", yargv.host,
    "--content-base", contentBase,
  ]);
};
