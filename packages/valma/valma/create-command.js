#!/usr/bin/env vlm

exports.command = "create-command";
exports.summary = "Create and export a valma command script skeleton";
exports.describe = `${exports.summary}. The script file is placed under current directory valma/${
    ""} and the export is placed into package.json bin section.`;

exports.builder = (yargs) => {
  return yargs.vlm.packageConfig && yargs.options({
    command: {
      type: "string", description: "The name of the new valma command (set as exports.command)",
      interactive: { type: "input", when: "if-undefined" }
    },
    filename: {
      type: "string", description: "The new command skeleton file name under valma/",
      interactive: { type: "input", when: "if-undefined" }
    },
    local: {
      type: "boolean", default: false,
      description: "Export command as valma.bin/ symlink instead of in package.json:bin",
    },
    summary: {
      type: "string", description: "One line summary of the new command (set as exports.summary)",
      interactive: { type: "input", when: "if-undefined" },
    },
    brief: {
      type: "string", description: "Couple word description of the new command for logging",
    },
    describe: {
      type: "string", description: "Full description of the new command (set as exports.describe)",
    },
  });
}

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const command = yargv.command;
  const commandParts = command.replace(/\//g, "_").match(/^(\.)?(.*)$/);
  const commandExportName = `${commandParts[1] || ""}valma-${commandParts[2]}`;
  const scriptPath = `valma/${yargv.filename}`;
  let verb = "already exports";
  while (!(vlm.packageConfig.bin || {})[commandExportName]) {
    const choices = ["Create", "skip"];
    if (yargv.describe) choices.push("help");
    const answer = await vlm.inquire([{
      message: `Create a ${yargv.brief || ""} valma command script template as package.json:bin["${
          commandExportName}"] -> "${scriptPath}"?`,
      type: "list", name: "choice", default: choices[0], choices,
    }]);
    if (answer.choice === "skip") {
      verb = "doesn't export";
      break;
    }
    if (answer.choice === "help") {
      console.log(describeText);
      if (yargv.brief) {
        console.log(`This step creates a ${yargv.brief} valma command script template\n`);
      }
      continue;
    }
    vlm.shell.mkdir("-p", "bin");
    vlm.shell.ShellString(_createBody(command, yargv.summary, yargv.describe))
        .to(scriptPath);
    vlm.updatePackageConfig({ bin: { [commandExportName]: scriptPath } });
    verb = "now exports";
  }
  console.log(`valma-create-command: this repository ${verb} valma command ${command}`);
};

function _createBody (command, summary, describe) {
  const header = (command[0] === ".") || command.includes("/.") ? "" : "#!/usr/bin/env vlm\n\n";
  return`${header
}exports.command = "${command}";
exports.summary = "${summary || ""}";
exports.describe = \`\${exports.summary}.\n${describe || ""}\`;

exports.builder = (yargs) => {
  return yargs;
/*
  const vlm = yargs.vlm;
  return undefined; // if the command should be dynamically disabled.
  return yargs.options({
    myText: {
      type: "string", default: "lorem", description: "lorem ipsum dolor sit amet",
      interactive: { type: "input", when: "if-undefined" },
      // See https://github.com/SBoudrias/Inquirer.js/ for other interactive attributes
    },
    myFlag: {
      type: "boolean", default: true, description: "consectetur adipiscing elit",
      interactive: { type: "confirm", when: "if-undefined" },
    },
    // See https://github.com/yargs/yargs/blob/HEAD/docs/api.md for other yargs options
  });
*/
}

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
};
`;
}
