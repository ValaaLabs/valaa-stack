#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

exports.command = "revelations-dev-server [contentBase]";
exports.describe =
    "launches a webpack-dev-server at localhost using given <contentBase> as content root.";
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
exports.handler = function handler (argv) {
  const contentBase = argv.contentBase || "dist/revelations";
  if (!shell.test("-d", contentBase)) {
    console.log("Creating and populating an initially missing content base directory", contentBase,
        `(for this first time only) from ${argv.revelations}`);
    shell.mkdir("-p", contentBase);
    shell.cp("-R", path.join(argv.revelations, "*"), contentBase);
  }
  shell.exec(`npx -c "webpack-dev-server ${""
        } ${argv.inline ? "--inline" : ""
        } ${argv.progress ? "--progress" : ""
        } ${argv.open ? "--open" : ""
        } --host ${argv.host} --content-base ${contentBase}"`);
};
