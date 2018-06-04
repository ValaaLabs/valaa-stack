#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

exports.command = "revelations-dev-server [distContentBase]";
exports.summary = "Launches a webpack-dev-server at localhost";
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
  const contentBase = yargv.distContentBase || "dist/revelations";
  if (!shell.test("-d", contentBase)) {
    console.log("Creating and populating an initially missing content base directory", contentBase,
        `(for this first time only) from ${yargv.source}`);
    shell.mkdir("-p", contentBase);
    shell.cp("-R", path.posix.join(yargv.source, "*"), contentBase);
  }
  shell.exec(`npx -c "webpack-dev-server ${""
        } ${yargv.inline ? "--inline" : ""
        } ${yargv.progress ? "--progress" : ""
        } ${yargv.open ? "--open" : ""
        } --host ${yargv.host} --content-base ${contentBase}"`);
};
