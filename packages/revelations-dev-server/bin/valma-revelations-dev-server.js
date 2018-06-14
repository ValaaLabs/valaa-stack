#!/usr/bin/env vlm

exports.command = "revelations-dev-server [distContentBase]";
exports.summary = "Launch a webpack-dev-server at localhost";
exports.describe = `${exports.summary} using given <contentBase> as content root`;

exports.builder = function builder (yargs) {
  return yargs
      .option({
        source: {
          type: "string", default: "./revelations/",
          description:
              "the source revelations directory used to populate the contentBase if it is empty",
        },
        host: {
          type: "string", default: "0.0.0.0",
          description: "the local ip where the server is bound"
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
        }
      });
};
exports.handler = function handler (yargv) {
  const vlm = yargv.vlm;
  const contentBase = yargv.distContentBase || "dist/revelations";
  if (!vlm.shell.test("-d", contentBase)) {
    console.log("Creating and populating an initially missing content base directory", contentBase,
        `(for this first time only) from ${yargv.source}`);
    vlm.shell.mkdir("-p", contentBase);
    vlm.shell.cp("-R", vlm.path.join(yargv.source, "*"), contentBase);
  }
  return vlm.executeExternal("npx", [
    "-c", `webpack-dev-server ${""
        } ${yargv.inline ? "--inline" : ""
        } ${yargv.progress ? "--progress" : ""
        } ${yargv.open ? "--open" : ""
        } --host ${yargv.host} --content-base ${contentBase}`
  ]);
};
