#!/usr/bin/env vlm

exports.command = "create-command";
exports.describe = "Create a valma command script skeleton";
exports.introduction = `${exports.describe}.

The script file is placed under valma/ with a symlink to it in
valma.bin/ , making the command immediately visible to valma.`;

exports.disabled = (yargs) => !yargs.vlm.packageConfig;
exports.builder = (yargs) => yargs.options({
  command: {
    type: "string", description: "The name of the new valma command (set as exports.command)",
    interactive: { type: "input", when: "if-undefined" }
  },
  filename: {
    type: "string",
    description: "The new command skeleton filename in valma/ (leave empty for default)",
    interactive: { type: "input", when: "if-undefined" }
  },
  brief: {
    type: "string", description: "Description of couple words of the new command",
  },
  export: {
    type: "boolean", default: false,
    description: "Export command in package.json:bin section instead of valma.bin/ symlinking",
  },
  skeleton: {
    type: "boolean", default: false,
    description: "If true will only create a minimal script skeleton",
  },
  describe: {
    type: "string",
    description: "Max 71 char description of the new command (set as exports.describe)",
    interactive: { type: "input", when: "if-undefined" },
  },
  header: {
    type: "string", description: "Lines to place at the beginning of the script skeleton",
  },
  introduction: {
    type: "string", description: "Full description of the new command, set as exports.introduction",
  },
  disabled: {
    type: "string", description: "Full exports.disabled source (as function callback)",
  },
  builder: {
    type: "string", description: "Full exports.builder source (as function callback)",
  },
  handler: {
    type: "string", description: "Full exports.handler source (as function callback)",
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
  while (!(vlm.packageConfig.bin || {})[commandExportName]) {
    const choices = [local ? "Create" : "Export", "skip",
      local ? "export instead" : "local instead"
    ];
    if (yargv.introduction) choices.push("help");
    const linkMessage = local
        ? `'valma.bin/${commandExportName}'`
        : `'package.json':bin["${commandExportName}"]`;
    const answer = await vlm.inquire([{
      message: `${local ? "Create" : "Export"
          } a ${yargv.brief || (local ? "local command" : "command")
          } script ${yargv.skeleton ? "skeleton" : "template"
          } as ${linkMessage} -> '${scriptPath}'?`,
      type: "list", name: "choice", default: choices[0], choices,
    }]);
    if (answer.choice === "skip") {
      verb = "doesn't export";
      break;
    }
    if (answer.choice === "help") {
      vlm.speak(yargv.introduction);
      vlm.info(`This step creates a ${yargv.brief || (local ? "local" : "exported")
          } valma command script template\n`);
      continue;
    }
    if (answer.choice === "export instead") { local = false; continue; }
    if (answer.choice === "local instead") { local = true; continue; }
    if (!vlm.shell.test("-e", scriptPath)) {
      vlm.shell.mkdir("-p", vlm.path.dirname(scriptPath));
      vlm.shell.ShellString(_createSource(command, yargv)).to(scriptPath);
    } else {
      vlm.warn(`not overwriting already existing script '${scriptPath}'`);
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
      vlm.warn(`cannot create local symlink at '${symlinkPath}' which already exists`);
      verb = "already symlinks";
      break;
    }
  }
  const message = `This repository ${vlm.colors.bold(verb)} valma command '${
      vlm.colors.command(command)}'.`;
  if (verb === "already exports") {
    vlm.warn(message);
    vlm.instruct(`You can edit the existing command script at ${
        vlm.packageConfig.bin[commandExportName]}`);
  } else {
    vlm.info(message);
    vlm.instruct(`You can edit the command ${yargv.skeleton ? "skeleton" : "template"} at ${
        scriptPath}`);
  }
  return { local, verb, [command]: scriptPath };
};

function _createSource (command, yargv) {
  // Emit shebang only if the command is a top-level command.
  const components = yargv.skeleton ? _createSkeleton() : _createExample();
  return `${(command[0] === ".") || command.includes("/.") ? "" : "#!/usr/bin/env vlm\n\n"
}${yargv.header || ""
}exports.command = "${command}";
exports.describe = "${yargv.describe || yargv.brief || ""}";
exports.introduction = \`\${exports.describe}.${
    yargv.introduction ? `\n\n${yargv.introduction}` : ""}\`;

exports.disabled = ${yargv.disabled || components.disabled};
exports.builder = ${yargv.builder || components.builder};

exports.handler = ${yargv.handler || components.handler};
`;

  function _createSkeleton () {
    return {
      disabled: "(yargs) => !yargs.vlm.packageConfig",
      builder:
`(yargs) => {
  const vlm = yargs.vlm;
  return yargs;
}`,
      handler:
`(yargv) => {
  const vlm = yargv.vlm;
  return true;
}`,
    };
  }

  function _createExample () {
    return {
      disabled: "(yargs) => !yargs.vlm.packageConfig",
      builder:
`(yargs) => {
  const vlm = yargs.vlm;
  return yargs.options({
    name: {
      // See https://github.com/yargs/yargs/blob/HEAD/docs/api.md for yargs options
      type: "string", description: "current package name",
      default: vlm.packageConfig.name,
      // See https://github.com/SBoudrias/Inquirer.js/ about interactive attributes
      interactive: { type: "input", when: "if-undefined" },
    },
    color: {
      type: "string", description: "message color",
      default: "reset", choices: ["reset", "red", "black"],
      interactive: { type: "list", when: "always" },
    },
  });
}`,
      handler:
`(yargv) => {
  // Example template which displays the command name itself and package name where it is ran
  // Only enabled inside package
  const vlm = yargv.vlm;
  vlm.info(vlm.colors[yargv.color](\`This is '${command}' running inside '\${yargv.name}'\`));
}`,
    };
  }
}
