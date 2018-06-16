#!/usr/bin/env vlm

exports.command = "create-command";
exports.summary = "Create a valma command script skeleton";
exports.describe = `${exports.summary}.
The script file is placed under valma/ with a symlink to it in
valma.bin/ , making the command immediately visible to valma.
`;

exports.disabled = (yargs) => !yargs.vlm.packageConfig;
exports.builder = (yargs) => yargs.options({
  command: {
    type: "string", description: "The name of the new valma command (set as exports.command)",
    interactive: { type: "input", when: "if-undefined" }
  },
  filename: {
    type: "string", description: "The new command skeleton filename in valma/ (leave empty for default)",
    interactive: { type: "input", when: "if-undefined" }
  },
  export: {
    type: "boolean", default: false,
    description: "Export command in package.json:bin section instead of valma.bin/ symlinking",
  },
  summary: {
    type: "string", description: "One line summary of the new command (set as exports.summary)",
    interactive: { type: "input", when: "if-undefined" },
  },
  brief: {
    type: "string", description: "Description of couple words of the new command for logging",
  },
  describe: {
    type: "string", description: "Full description of the new command (set as exports.describe)",
  },
});

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  const command = yargv.command;
  const commandParts = command.replace(/\//g, "_").match(/^(\.)?(.*)$/);
  const commandExportName = `${commandParts[1] || ""}valma-${commandParts[2]}`;
  const scriptPath = `valma/${yargv.filename || `${commandParts[2]}.js`}`;
  let verb = "already exports";
  let local = !yargv.export;
  console.log("prbblbl");
  while (!(vlm.packageConfig.bin || {})[commandExportName]) {
    const choices = ["Create", "skip", local ? "export instead" : "local instead"];
    if (yargv.describe) choices.push("help");
    const linkMessage = local
        ? `'valma.bin/${commandExportName}'`
        : `'package.json':bin["${commandExportName}"]`;
    const answer = await vlm.inquire([{
      message: `Create a ${yargv.brief || yargv.brief || local ? "local" : "exported"
          } valma command script template as ${linkMessage} -> '${scriptPath}'?`,
      type: "list", name: "choice", default: choices[0], choices,
    }]);
    if (answer.choice === "skip") {
      verb = "doesn't export";
      break;
    }
    if (answer.choice === "help") {
      console.log(yargv.describe);
      console.log(`This step creates a ${yargv.brief || local ? "local" : "exported"
          } valma command script template\n`);
      continue;
    }
    if (answer.choice === "export instead") { local = false; continue; }
    if (answer.choice === "local instead") { local = true; continue; }
    if (!vlm.shell.test("-e", scriptPath)) {
      vlm.shell.mkdir("-p", vlm.path.dirname(scriptPath));
      vlm.shell.ShellString(_createBody(command, yargv.summary, yargv.describe)).to(scriptPath);
    } else {
      console.log(`valma-create-command: not overwriting already existing script '${scriptPath}'`);
    }
    const symlinkPath = vlm.path.join("valma.bin", commandExportName);
    if (!local) {
      vlm.updatePackageConfig({ bin: { [commandExportName]: scriptPath } });
      verb = "now exports";
    } else if (!vlm.shell.test("-e", symlinkPath)) {
      vlm.shell.mkdir("-p", vlm.path.dirname(symlinkPath));
      vlm.shell.ln("-s", `../${scriptPath}`, symlinkPath);
      verb = "now symlinks";
      break;
    } else {
      console.log(`valma-create-command: cannot create local symlink at '${symlinkPath
          }' which already exists`);
      verb = "already symlinks";
      break;
    }
  }
  console.log(`valma-create-command: this repository ${verb} valma command ${command}`);
};

function _createBody (command, summary, describe) {
  const header = (command[0] === ".") || command.includes("/.") ? "" : "#!/usr/bin/env vlm\n\n";
  return `${header
}exports.command = "${command}";
exports.summary = "${summary || ""}";
exports.describe = \`\${exports.summary}.\n${describe || ""}\`;

// Example template which displays the command name itself and package name where it is ran
// Only enabled inside package
exports.disabled = (yargs) => !yargs.vlm.packageConfig;
exports.builder = (yargs) => {
  const vlm = yargs.vlm;
  return yargs.options({
    name: {
      type: "string", description: "current package name",
      default: vlm.packageConfig.name,
      interactive: { type: "input", when: "if-undefined" },
      // See https://github.com/SBoudrias/Inquirer.js/ for more interactive attributes
    },
    color: {
      type: "string", description: "message color",
      default: "reset", choices: ["reset", "red", "black"],
      interactive: { type: "list", when: "always" },
      // See https://github.com/SBoudrias/Inquirer.js/ for more interactive attributes
    },
    // See https://github.com/yargs/yargs/blob/HEAD/docs/api.md for more yargs options
  });
};

exports.handler = (yargv) => {
  const vlm = yargv.vlm;
  console.log(vlm.colors[yargv.color](\`This is '${command}' running inside '\${yargv.name}'\`));
};
`;
}
