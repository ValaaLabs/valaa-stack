#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const inquirer = require("inquirer");
const minimatch = require("minimatch");
const path = require("path");
const shell = require("shelljs");
const semver = require("semver");
let yargs = require("yargs");


/* eslint-disable vars-on-top, no-loop-func, no-restricted-syntax, no-cond-assign,
                  import/no-dynamic-require
*/

const nodeCheck = ">=8.10.0";
const npmCheck = ">=5.0.0";

const defaultPaths = {
  packagePool: "localbin/",
  dependedPool: "node_modules/.bin/",
  globalPool: process.env.VLM_GLOBAL_POOL || (shell.which("vlm") || "").slice(0, -3),
};

let activePools = [];

const description =
    `Valma (or 'vlm') is a script dispatcher.

Any npm package which exports scripts prefixed 'valma-' or '.valma-' in their
package.json bin section is called a valma module. When such a module is added
as a devDependency for a package, valma will then be able to locate and
dispatch calls to those scripts when called from inside that package.

There are two types of valma scripts: listed and unlisted.
Listed scripts can be seen with 'vlm' or 'vlm --help'. They are intended to be
called directly from the command line by stripping away the 'valma-' prefix
(ie. a script exported in bin as 'valma-status' can be called with 'vlm status'
etc.)
Unlisted scripts are all valma scripts whose name begins with a '.' (or any of
their path parts for nested scripts). These scripts can still be called with
valma normally but are intended to be used indirectly by other valma scripts.

Note: valma treats the underscore '_' equal to '/' in all command pattern
matching contexts. While use of '_' is otherwise optional, it is specifically
mandatory to use '_' inside the package.json bin section export names (npm
doesn't support bin '/' or at least not sharing the folders between separate
packages).`;

yargs = yargs
    .help(false)
    .version(false)
    .wrap(yargs.terminalWidth() < 120 ? yargs.terminalWidth() : 120)
    .group("help", "Common options:")
    .group("version", "Common options:")
    .option({
      version: {
        group: "Common options:",
        alias: "version", type: "boolean", default: false, global: true,
        description: "Show the version of the command (or vlm itself)",
      },
      info: {
        group: "Common options:",
        type: "boolean", default: false, global: true,
        description: "Show the info block and description of the command",
      },

      i: {
        alias: "interactive", type: "boolean", default: true, global: false,
        description: "Prompt for missing required fields",
      },
      e: {
        alias: "echo", type: "boolean", default: true, global: false,
        description: "Echo all sub-command and external command calls and returns",
      },

      l: {
        alias: "list", type: "boolean", default: false, global: false,
        description: "Lists scripts which match the command",
      },
      u: {
        alias: "unlisted", type: "boolean", default: false, global: false,
        description: "Lists unlisted scripts in listings and help",
      },
      n: {
        alias: "no-node", type: "boolean", default: false, global: false,
        description: "Don't add node environment",
      },
      v: {
        alias: "verbose", count: true, global: false,
        description: "Be noisy. -vv... -> be more noisy.",
      },
      "package-pool": {
        type: "string", default: defaultPaths.packagePool, global: false,
        description: "Package pool path is the first pool to be searched",
      },
      "depended-pool": {
        type: "string", default: defaultPaths.dependedPool, global: false,
        description: "Depended pool path is the second pool to be searched",
      },
      "global-pool": {
        type: "string", default: defaultPaths.globalPool || null, global: false,
        description: "Global pool path is the third pool to be searched",
      },
    })
    .completion("bash-completion", (current, argvSoFar) => {
      const rule = _underToSlash(_valmaGlobFromCommandPrefix(argvSoFar._[1], argvSoFar.unlisted));
      return [].concat(...activePools.map(pool => pool.listing
          .filter(s => !_isDirectory(s) && minimatch(_underToSlash(s.name || ""), rule,
              { dot: argvSoFar.unlisted }))
          .map(s => _valmaCommandFromPath(s.name))));
    });


const vlm = yargs.vlm = {
  inquire: inquirer.createPromptModule(),
  callValma,
  executeExternal,
  updatePackageConfig,
  updateValmaConfig,
  matchPoolCommandNames,
};

let preYargv;
let needNode;
let needVLMPath;
let needForward;
let verbosity = 0;

let fullyBuiltin = (process.argv[2] === "--get-yargs-completions");
if (!fullyBuiltin) {
  preYargv = yargs.argv;
  fullyBuiltin = preYargv.l || !preYargv._.length;
  verbosity = preYargv.verbose;
  vlm.echo = preYargv.echo || verbosity;
  vlm.unlisted = preYargv.unlisted;
  if (!fullyBuiltin) {
    needNode = !preYargv.noNode && !process.env.npm_package_name;
    needVLMPath = !process.env.VLM_PATH;
    needForward = needVLMPath;
  }
}

const availablePools = [
  { name: "package", path: (preYargv || defaultPaths).packagePool, rootPath: process.cwd() },
  { name: "depended", path: (preYargv || defaultPaths).dependedPool, rootPath: process.cwd() },
  { name: "global", path: (preYargv || defaultPaths).globalPool },
];

// Phase 1: Pre-load args with so-far empty pools to detect fully builtin commands (which don't
// need forwarding).
if ((process.argv[2] === "-v") && (process.argv[3] === "-v")) {
  console.log("Phase 1, argv:", JSON.stringify(process.argv),
      "\n\tcommand:", preYargv._[0],
      "\n\tfullyBuiltin:", fullyBuiltin, ", needNode:", needNode, ", needVLMPath:", needVLMPath,
      "\n\tcwd:", process.cwd(),
      "\n\tprocess.env.VLM_GLOBAL_POOL:", process.env.VLM_GLOBAL_POOL,
          ", process.env.VLM_PATH:", process.env.VLM_PATH,
      "\n\tprocess.env.PATH:", process.env.PATH,
      "\n\tdefaultPaths:", JSON.stringify(defaultPaths),
      "\npreYargv:", preYargv,
      "\n",
  );
}

const packageConfigStatus = {
  path: path.posix.join(process.cwd(), "package.json"), updated: false,
};
const valmaConfigStatus = {
  path: path.posix.join(process.cwd(), "valma.json"), updated: false,
};

let rootHelp = false;

main();

async function main () {
  // Phase 2: Load pools and forward to 'vlm' if needed (if a more specific 'vlm' is found or if the
  // node environment or 'vlm' needs to be loaded)
  const forwarding = _refreshActivePoolsAndMaybeForward();
  if (forwarding) return;

  if (verbosity >= 2) {
    console.log("Phase 2, activePools:", ...activePools.map(pool =>
        Object.assign({}, pool, {
          listing: Array.isArray(pool.listing) && pool.listing.map(entry => entry.name)
        })), "\n");
  }

  if (!fullyBuiltin && needVLMPath) {
    console.error("vlm: could not locate 'vlm' forward in any pool",
        "while trying to load node environment variables");
    process.exit(-1);
  }

  if (!semver.satisfies(process.versions.node, nodeCheck)) {
    console.warn(`vlm warning: node ${nodeCheck} recommended, got`, process.versions.node);
  }

  const npmVersion = (process.env.npm_config_user_agent || "").match(/npm\/([^ ]*) /);
  if (npmVersion && !semver.satisfies(npmVersion[1], npmCheck)) {
    console.warn(`vlm warning: npm ${npmCheck} recommended, got`, npmVersion[1]);
  }

  _reloadPackageAndValmaConfigs();

  if (needNode && vlm.packageConfig) {
    console.warn("vlm warning: could not load node environment");
  }

  // Phase 3: parse argv properly against the command pools which match the requested command
  const help = preYargv && preYargv.help;
  const command = (typeof help === "string") ? help : (preYargv && preYargv._[0]);
  if (!command) {
    rootHelp = help;
    if (preYargv && preYargv.version) {
      console.log(_commandInfo(__filename)[1]);
      process.exit(0);
    }
    if (preYargv && preYargv.info) {
      _outputCommandInfo(["vlm", ..._commandInfo(__filename, path.dirname(process.argv[1]))],
          description);
      process.exit(0);
    }
  }

  const userArgv = process.argv.slice(2);
  const restArgv = userArgv.slice(userArgv.indexOf(command) + 1);
  if (help && !restArgv.includes("--help")) restArgv.unshift("--help");

  const maybeRet = vlm.callValma(command, restArgv);
  vlm.callValma = callValmaWithEcho;
  const ret = await maybeRet;

  _flushPendingConfigWrites();
  process.exit(ret);
}

async function callValmaWithEcho (command, argv = []) {
  if (vlm.echo) console.log("    ->> vlm", command, ...argv);
  const ret = await callValma(command, argv);
  if (vlm.echo) console.log("    <<- vlm", command, ...argv);
  return ret;
}

async function callValma (command, argv = []) {
  const commandGlob = _underToSlash((preYargv && preYargv.unlisted)
      ? _valmaGlobFromCommandPrefix(command, true)
      : _valmaGlobFromCommand(command || "*"));
  const isWildCardCommand = !command || (command.indexOf("*") !== -1);
  const activeCommands = {};
  if (verbosity >= 2) console.log("Phase 3, commandGlob:", commandGlob, ", argv:\n", argv, "\n");
  const restArgv = argv.slice(argv.indexOf(command) + 1);

  for (const pool of activePools) {
    pool.commands = {};
    pool.listing.forEach(file => {
      // console.log("matching:", _isDirectory(file), _underToSlash(file.name), commandGlob, ": ",
      //    minimatch(_underToSlash(file.name), commandGlob, { dot: vlm.unlisted }));
      if (_isDirectory(file)) return;
      if (!minimatch(_underToSlash(file.name), commandGlob, { dot: vlm.unlisted })) return;
      const commandName = _valmaCommandFromPath(file.name);
      pool.commands[commandName] = {
        commandName, pool, file,
        modulePath: path.posix.join(pool.absolutePath, file.name),
      };
      if (activeCommands[commandName]) return;
      const activeCommand = activeCommands[commandName] = pool.commands[commandName];
      if (!preYargv || preYargv.list || !shell.test("-e", activeCommand.modulePath)) return;
      const module = activeCommand.module = require(activeCommand.modulePath);
      if (verbosity >= 3) {
        console.log("Phase 3.5, pool.absolutePath:", pool.absolutePath,
            ", file.name:", file.name);
      }
      if (!module || (module.command === undefined) || (module.describe === undefined)) {
        throw new Error(`vlm: invalid script module '${activeCommand.modulePath
            }', export 'command' or 'describe' missing`);
      }
      yargs = yargs.command(module.command, module.summary || module.describe,
          module.builder, () => {});
    });
  }

  // Phase 4: perform the yargs run, possibly evaluating help, list etc. non-dispatch options.
  if (rootHelp) yargs.help();

  const yargv = yargs.parse(argv);

  if (verbosity >= 2) {
    console.log("Phase 4:", argv, "\n\tinto", yargv, ", context:\n", yargs.getContext(),
        ", activeCommands:\n", Object.keys(activeCommands).map(
              key => `\n\t${key}: ${activeCommands[key].modulePath}`), "\n");
  }

  const showInfo = preYargv.info || yargv.info;
  const showVersion = preYargv.version || yargv.version;

  if (showInfo || showVersion) {
    if (!command) {
      console.log(description);
    } else {
      let align = 0;
      Object.keys(activeCommands).forEach(n => { if (n.length > align) align = n.length; });
      let versionAlign = 0;
      Object.values(activeCommands).map((activeCommand) => {
        if (!activeCommand) return {};
        const info = _commandInfo(activeCommand.modulePath, activeCommand.pool.path);
        if (info[0].length > versionAlign) versionAlign = info[0].length;
        return { activeCommand, info };
      }).forEach(({ activeCommand, info }) => {
        if (info) {
          _outputCommandInfo([
            [activeCommand.commandName, align], "|",
            [info[0], versionAlign], "|",
            ...info.slice(1),
          ], showInfo && activeCommand.module && activeCommand.module.describe);
        }
      });
      if (!showInfo && !isWildCardCommand) {
        console.log(infos[0][0]);
        return 0;
      }
  }
    return 0;
  }

  if (!Object.keys(activeCommands).length && !isWildCardCommand) {
    console.log(`vlm: cannot find command '${command}' from pools:`,
    ...activePools.map(emptyPool => `"${path.posix.join(emptyPool.path, commandGlob)}"`));
    return -1;
  }

  // Phase 5: Dispatch the command(s)

  if (verbosity >= 2) console.log("Phase 5:", yargv);

  if (!command || (preYargv && preYargv.list)) return _outputSimpleUsage(yargv, commandGlob);

  const commandArgs = restArgv.map(arg => JSON.stringify(arg)).join(" ");

  // Reverse to have matching global command names execute first (while obeying overrides)
  for (const activePool of activePools.slice().reverse()) {
    for (const matchingCommand of Object.keys(activePool.commands).sort()) {
      const activeCommand = activeCommands[matchingCommand];
      if (!activeCommand) continue;
      const module = activeCommand.module;
      if (!module) {
        console.error("vlm error: trying to execute command", matchingCommand,
            "link missing its target at", activeCommand.modulePath);
        continue;
      }
      const optionsYargs = Object.create(yargs);
      const interactiveOptions = {};
      optionsYargs.option = optionsYargs.options = (opt, attributes) => {
        if (typeof opt === "object") {
          Object.keys(opt).forEach(key => optionsYargs.option(key, opt[key]));
          return optionsYargs;
        }
        if (attributes.interactive) interactiveOptions[opt] = attributes;
        return yargs.options(opt, attributes);
      };
      yargs = yargs.help().command(module.command, module.describe);
      const subCommand = `${matchingCommand} ${commandArgs}`;
      const subYargv = module.builder(optionsYargs).parse(subCommand, { vlm });
      // console.log("forwarding...\n\toptions:", yargs.getOptions(), "\n\tsubArgv:", subYargv,
      //     "\n\tinteractives:", interactiveOptions);
      await _tryInteractive(subYargv, interactiveOptions);
      if (preYargv.echo && (matchingCommand !== command)) console.log("    ->> vlm", subCommand);
      await module.handler(subYargv);
      if (preYargv.echo && (matchingCommand !== command)) console.log("    <<- vlm", subCommand);
      delete activeCommands[matchingCommand];
    }
  }
  return 0;
}


// eslint-disable-next-line no-bitwise
function _isDirectory (candidate) { return candidate.mode & 0x4000; }

// If the command begins with a dot, insert the 'valma-' prefix _after_ the dot; this is useful
// as directories beginning with . don't match /**/ and * glob matchers and can be considered
// implementation detail.
function _valmaGlobFromCommand (commandBody) {
  return !commandBody ? "valma-"
      : (commandBody[0] === ".") ? `.valma-${commandBody.slice(1)}`
      : `valma-${commandBody}`;
}

function _valmaGlobFromCommandPrefix (commandPrefix = "", showUnlisted) {
  return !commandPrefix && showUnlisted
      ? `{.,}valma-{,*/**/}*`
      : `${_valmaGlobFromCommand(commandPrefix)}{,*/**/}*`;
}

function _valmaCommandFromPath (pathname) {
  const match = pathname.match(/(\.?)valma-(.*)/);
  return _underToSlash(`${match[1]}${match[2]}`);
}

function _underToSlash (text = "") {
  if (typeof text !== "string") throw new Error(`expected string, got: ${JSON.stringify(text)}`);
  return text.replace(/_/g, "/");
}

function _commandInfo (commandPath, poolPath) {
  if (!commandPath || !shell.test("-e", commandPath)) {
    return ["<missing_command_script>", "<missing_command_script>", poolPath, commandPath];
  }
  const realPath = fs.realpathSync(commandPath);
  let remaining = path.dirname(realPath);
  while (remaining !== "/") {
    const packagePath = path.posix.join(remaining, "package.json");
    if (shell.test("-f", packagePath)) {
      const packageJson = JSON.parse(shell.head({ "-n": 1000000 }, packagePath));
      return [packageJson.version, packageJson.name, poolPath, realPath];
    }
    remaining = path.posix.join(remaining, "..");
  }
  return ["<missing_command_package>", "<missing_command_package>", poolPath, realPath];
}

function _outputCommandInfo (elements, description_) {
  console.log(...elements.map(
      entry => (Array.isArray(entry) ? _rightpad(entry[0], entry[1]) : entry)));
  if (description_) {
    console.log();
    console.log(description_);
    console.log();
  }
}

function _rightpad (text, align) { return `${text}${" ".repeat(align - text.length)}`; }

function _refreshActivePoolsAndMaybeForward () {
  activePools = [];
  let specificEnoughVLMSeen = false;
  for (const pool of availablePools) {
    if (!pool.path || !shell.test("-d", pool.path)) continue;
    pool.absolutePath = pool.rootPath ? path.posix.resolve(pool.rootPath, pool.path) : pool.path;
    let poolHasVLM = false;
    pool.listing = shell.ls("-lAR", pool.path)
        .filter(file => {
          if (file.name.slice(0, 5) === "valma" || file.name.slice(0, 6) === ".valma") return true;
          if (file.name === "vlm") poolHasVLM = true;
          return false;
        });
    activePools.push(pool);
    if (process.argv[1].indexOf(pool.absolutePath) === 0) specificEnoughVLMSeen = true;
    if (verbosity) {
      console.log(pool.path, !poolHasVLM, fullyBuiltin, !needForward, specificEnoughVLMSeen);
    }
    if (!poolHasVLM || fullyBuiltin || (!needForward && specificEnoughVLMSeen)) continue;
    if (!process.env.VLM_PATH) {
      process.env.VLM_PATH = pool.absolutePath;
      process.env.PATH = `${pool.absolutePath}:${process.env.PATH}`;
    }
    if (!process.env.VLM_GLOBAL_POOL && (preYargv || defaultPaths).globalPool) {
      process.env.VLM_GLOBAL_POOL = (preYargv || defaultPaths).globalPool;
    }
    const vlmPath = path.posix.join(pool.absolutePath, "vlm");
    if (needNode) {
      const argString = process.argv.slice(2).map(a => JSON.stringify(a)).join(" ");
      if (verbosity) console.log(`Forwarding via spawn: "npx -c '${vlmPath} ${argString}'"`);
      spawn("npx", ["-c", `${vlmPath} ${argString}`],
          { env: process.env, stdio: ["inherit", "inherit", "inherit"], detached: true });
    } else {
      if (verbosity) {
        console.log(`Forwarding via spawn: "${vlmPath}`, ...process.argv.slice(2), `"`);
      }
      spawn(vlmPath, process.argv.slice(2),
          { env: process.env, stdio: ["inherit", "inherit", "inherit"], detached: true });
    }
    return true;
  }
  return false;
}

function matchPoolCommandNames (pattern) {
  const minimatcher = _underToSlash(pattern);
  return [].concat(...activePools.map(pool => pool.listing
      .map(file => _underToSlash(file.name))
      .filter(name => minimatch(name, minimatcher, { dot: vlm.unlisted }))));
}

function executeExternal (executable, argv = []) {
  return new Promise((resolve, failure) => {
    _flushPendingConfigWrites();
    if (verbosity) {
      console.log("vlm: executing command line: ", executable, argv);
    }
    if (preYargv.echo) console.log("    ->>", executable, ...argv);
    const subprocess = spawn(executable, argv,
        { env: process.env, stdio: ["inherit", "inherit", "inherit"] });
    subprocess.on("exit", (code, signal) => {
      if (code || signal) failure(code || signal);
      else {
        _refreshActivePoolsAndMaybeForward();
        _reloadPackageAndValmaConfigs();
        if (preYargv.echo) console.log("    <<-", executable, ...argv);
        resolve();
      }
    });
    subprocess.on("error", failure);
  });
}

function _outputSimpleUsage (yargv, commandGlob) {
  if (!yargv.list) {
    console.log("Simple usage: vlm [--help] [-l | --list] <command> [-- <args>]\n");
  }
  let align = 0;
  for (const p of activePools) {
    Object.keys(p.commands).forEach(name => { if (name.length > align) align = name.length; });
  }
  for (const listPool of activePools) {
    if (!Object.keys(listPool.commands).length) {
      console.log(`#\t'${listPool.name}' pool empty (matching "${listPool.path}${commandGlob}")`);
    } else {
      console.log(`#\t'${listPool.name}' pool commands (matching "${
          listPool.path}${commandGlob}"):`);
      let versionAlign = 0;
      Object.keys(listPool.commands).sort().map(commandName => {
        const info = _commandInfo(listPool.commands[commandName].modulePath);
        if (info[0].length > versionAlign) versionAlign = info[0].length;
        return { commandName, info };
      }).forEach(({ commandName, info }) => {
        _outputCommandInfo([[commandName, align], "|", [info[0], versionAlign], "|", info[1]]);
      });

      console.log();
    }
  }
  return 0;
}

async function _tryInteractive (subYargv, interactiveOptions) {
  if (!subYargv.interactive) return subYargv;
  const questions = [];
  for (const optionName of Object.keys(interactiveOptions)) {
    const option = interactiveOptions[optionName];
    const question = Object.assign({}, option.interactive);
    if (question.when !== "always") {
      if ((question.when !== "if-undefined") || (typeof subYargv[optionName] !== "undefined")) {
        continue;
      }
    }
    delete question.when;
    if (!question.name) question.name = optionName;
    if (!question.message) question.message = option.description;
    if (!question.choices && option.choices) question.choices = option.choices;
    if (question.choices && option.default && !question.choices.includes(option.default)) {
      question.choices = [option.default].concat(question.choices);
    }
    if (option.default !== undefined) {
      if (question.type === "list") {
        question.default = question.choices.indexOf(option.default);
      } else {
        question.default = option.default;
      }
    }
    // if (!question.validate) ...;
    // if (!question.transformer) ...;
    // if (!question.pageSize) ...;
    // if (!question.prefix) ...;
    // if (!question.suffix) ...;
    questions.push(question);
  }
  if (!Object.keys(questions).length) return subYargv;
  const answers = await vlm.inquire(questions);
  return Object.assign(subYargv, answers);
}


function _reloadPackageAndValmaConfigs () {
  if (shell.test("-f", packageConfigStatus.path)) {
    vlm.packageConfig = JSON.parse(shell.head({ "-n": 1000000 }, packageConfigStatus.path));
  }
  if (shell.test("-f", valmaConfigStatus.path)) {
    vlm.valmaConfig = JSON.parse(shell.head({ "-n": 1000000 }, valmaConfigStatus.path));
  }
}

function updatePackageConfig (updates) {
  if (!vlm.packageConfig) {
    throw new Error("vlm.updatePackageConfig: cannot update package.json as it doesn't exist");
  }
  _deepAssign(vlm.packageConfig, updates, packageConfigStatus);
  if (verbosity) console.log("vlm: package.json updates:", updates);
}

function updateValmaConfig (updates) {
  if (!vlm.valmaConfig) {
    vlm.valmaConfig = {};
    valmaConfigStatus.updated = true;
  }
  _deepAssign(vlm.valmaConfig, updates, valmaConfigStatus);
  if (verbosity) console.log("vlm: valma.json updates:", updates);
}

function _deepAssign (target, source, updateStatus) {
  if (typeof source === "undefined") return target;
  if (Array.isArray(target)) return target.concat(source);
  if ((typeof source !== "object") || (source === null)
      || (typeof target !== "object") || (target === null)) return source;
  Object.keys(source).forEach(sourceKey => {
    const newValue = _deepAssign(target[sourceKey], source[sourceKey], updateStatus);
    if (newValue !== target[sourceKey]) {
      if (!updateStatus.updated) updateStatus.updated = true;
      target[sourceKey] = newValue;
    }
  });
  return target;
}

function _flushPendingConfigWrites () {
  if (packageConfigStatus.updated) {
    if (verbosity) console.log("vlm: repository configuration updated, writing package.json");
    const reorderedConfig = {};
    reorderedConfig.name = vlm.packageConfig.name;
    if (vlm.packageConfig.valaa !== undefined) reorderedConfig.valaa = vlm.packageConfig.valaa;
    Object.keys(vlm.packageConfig).forEach(key => {
      if (reorderedConfig[key] === undefined) reorderedConfig[key] = vlm.packageConfig[key];
    });
    const packageConfigString = JSON.stringify(reorderedConfig, null, 2);
    shell.ShellString(packageConfigString).to(packageConfigStatus.path);
    packageConfigStatus.updated = false;
  }

  if (valmaConfigStatus.updated) {
    if (verbosity) console.log("vlm: valma configuration updated, writing valma.json");
    const valmaConfigString = JSON.stringify(vlm.valmaConfig, null, 2);
    shell.ShellString(valmaConfigString).to(valmaConfigStatus.path);
    valmaConfigStatus.updated = false;
  }
}
