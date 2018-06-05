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

const valmaCommandExports = {
  command: "$0 [-dhiluv] [command]",
  summary: "Dispatch a valma command to its command script",
  describe: `Valma (or 'vlm') is a command script dispatcher.

Any npm package which exports scripts prefixed with 'valma-' (or '.valma-' for
unlisted scripts) in their package.json bin section is called a valma module.
The corresponding command name of a script is the name stripped of 'valma-'
and all '_' converted to '/'. When such a module is added as a devDependency
for a package, valma will then be able to locate and dispatch calls to those
scripts when called from inside that package.

There are two types of valma scripts: listed and unlisted.
Listed scripts can be seen with 'vlm' or 'vlm --help'. They are intended to be
called directly from the command line.
Unlisted scripts are all valma scripts whose name begins with a '.' (or any of
their path parts for nested scripts). These scripts can still be called with
valma normally but are intended to be used indirectly by other valma scripts.

Note: valma treats the underscore '_' equal to '/' in all command pattern
matching contexts. While use of '_' is otherwise optional, it is specifically
mandatory to use '_' inside the package.json bin section export names (npm
doesn't support bin '/' or at least not sharing the folders between separate
packages).`,

  builder: (yargs_) => yargs_
  //    .usage(valmaCommandExports.command, valmaCommandExports.summary, iy => iy)
      .options({
        interactive: {
          group: "Global options:",
          type: "boolean", default: true, global: false,
          description: "Prompt for missing required fields",
        },
        echo: {
          group: "Global options:",
          type: "boolean", default: true, global: false,
          description: "Echo all external and sub-command calls and returns",
        },
        promote: {
          group: "Global options:",
          type: "boolean", default: true, global: false,
          description: "Promote to 'vlm' in the most specific pool available",
        },
        "node-env": {
          group: "Global options:",
          type: "boolean", default: true, global: false,
          description: "Adds node environment if it is missing",
        },
        "bash-completion": {
          group: "Global options:",
          type: "boolean", global: false,
          description: "Output bash completion script",
        },
        "package-pool": {
          group: "Global options:",
          type: "string", default: defaultPaths.packagePool, global: false,
          description: "Package pool path is the first pool to be searched",
        },
        "depended-pool": {
          group: "Global options:",
          type: "string", default: defaultPaths.dependedPool, global: false,
          description: "Depended pool path is the second pool to be searched",
        },
        "global-pool": {
          group: "Global options:",
          type: "string", default: defaultPaths.globalPool || null, global: false,
          description: "Global pool path is the third pool to be searched",
        },
      }),
  handler, // Defined below.
};

// Valma singleton and the script API calls - these are available to all command scripts via both
// yargs.vlm in builder as well as yargv.vlm in handler.
const vlm = yargs.vlm = {
  // Calls valma sub-command with argv.
  callValma,

  // Executes an external command with argv.
  executeExternal,

  // Opens interactive inquirer prompt and return a completion promise.
  inquire: inquirer.createPromptModule(),

  // Contents of package.json
  packageConfig: undefined,

  // Contents of valma.json
  valmaConfig: undefined,

  // Registers pending updates to the package.json config file which are immediately available in
  // vlm.packageConfig but will be written to file only immediately before valma execution exits or
  // an external command is about to be executed.
  updatePackageConfig,

  // Registers pending updates to the valma.json config file which are immediately available in
  // vlm.valmaConfig but will be written to file only immediately before valma execution exits or
  // an external command is about to be executed.
  updateValmaConfig,

  // Returns a list of available sub-command names which match the given command glob.
  matchPoolCommandNames,
};

vlm.isCompleting = (process.argv[2] === "--get-yargs-completions");
const processArgv = vlm.isCompleting ? process.argv.slice(3) : process.argv.slice(2);

yargs = _sharedYargs(yargs, !vlm.isCompleting);
const globalYargs = valmaCommandExports.builder(yargs);
const globalYargv = _parseUntilCommand(globalYargs, processArgv, "command");

vlm.unlisted = globalYargv.unlisted;
if (!vlm.isCompleting) {
  vlm.verbosity = globalYargv.verbose;
  vlm.interactive = globalYargv.interactive;
  vlm.echo = globalYargv.echo;
}

if (vlm.verbosity >= 2) {
  console.log("vlm chatty: phase 1, argv:", JSON.stringify(process.argv),
      "\n\tcommand:", globalYargv.command, JSON.stringify(globalYargv._));
}
if (vlm.verbosity >= 3) {
  console.log("vlm voluble: globalYargv:", globalYargv);
}

const availablePools = [
  { name: "package", path: globalYargv.packagePool, rootPath: process.cwd() },
  { name: "depended", path: globalYargv.dependedPool, rootPath: process.cwd() },
  { name: "global", path: globalYargv.globalPool },
];
let activePools = [];

const packageConfigStatus = {
  path: path.posix.join(process.cwd(), "package.json"), updated: false,
};
const valmaConfigStatus = {
  path: path.posix.join(process.cwd(), "valma.json"), updated: false,
};

// Main entry.

vlm.contextYargv = globalYargv;
valmaCommandExports
    .handler(globalYargv)
    .then(result => (result !== undefined) && process.exit(result));

// Only function definitions from hereon.

async function handler (yargv) {
  // Phase 1: Pre-load args with so-far empty pools to detect fully builtin commands (which don't
  // need forwarding).
  const fullyBuiltin = vlm.isCompleting || yargv.list || !yargv.command;

  const needNode = !fullyBuiltin && yargv.nodeEnv && !process.env.npm_package_name;
  const needVLMPath = !fullyBuiltin && !process.env.VLM_PATH;
  const needForward = !fullyBuiltin && needVLMPath;

  if (vlm.verbosity >= 3) {
    console.log("vlm voluble: fullyBuiltin:", fullyBuiltin, ", needNode:", needNode,
            ", needVLMPath:", needVLMPath,
        "\n\tcwd:", process.cwd(),
        "\n\tprocess.env.VLM_GLOBAL_POOL:", process.env.VLM_GLOBAL_POOL,
            ", process.env.VLM_PATH:", process.env.VLM_PATH,
        "\n\tprocess.env.PATH:", process.env.PATH,
        "\n\tdefaultPaths:", JSON.stringify(defaultPaths),
    );
  }

  // Phase 2: Load pools and forward to 'vlm' if needed (if a more specific 'vlm' is found or if the
  // node environment or 'vlm' needs to be loaded)
  if (_refreshActivePools((pool, poolHasVLM, specificEnoughVLMSeen) => {
    if (vlm.verbosity >= 3) {
      console.log("vlm voluble:", pool.path, !poolHasVLM, fullyBuiltin, !needForward,
          specificEnoughVLMSeen);
    }
    if (!poolHasVLM || fullyBuiltin || (specificEnoughVLMSeen && !needForward)
        || (!specificEnoughVLMSeen && !yargv.promote)) return undefined;
    _forwardToValmaInPool(pool, needNode);
    return true;
  })) return undefined; // Forward was found.

  if (vlm.isCompleting) {
    vlm.contextYargv = globalYargv
    vlm.callValma(yargv.command, yargv._);
    return 0;
  }

  // Do validations.

  if (vlm.verbosity >= 2) {
    console.log("vlm chatty: phase 2, activePools:", ...[].concat(...activePools.map(pool =>
      ["\n", Object.assign({}, pool, {
        listing: Array.isArray(pool.listing) && pool.listing.map(entry => entry.name)
      })])), "\n");
  }

  if (!fullyBuiltin && needVLMPath) {
    console.error("vlm leaving: could not locate 'vlm' forward in any pool",
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

  const subVLM = Object.create(vlm);
  subVLM.contextYargv = yargv;
  const maybeRet = subVLM.callValma(yargv.command, yargv._);
  subVLM.callValma = callValmaWithEcho;
  const ret = await maybeRet;

  _flushPendingConfigWrites();
  return ret || 0;
}

async function callValmaWithEcho (command, argv = []) {
  if (vlm.echo) console.log("    ->> vlm", command, ...argv);
  const ret = await callValma.call(this, command, argv);
  if (vlm.echo) console.log("    <<- vlm", command, ...argv);
  return ret;
}

async function callValma (command, argv = []) {
  if (!Array.isArray(argv)) {
    throw new Error(`vlm.callValma: argv must be an array, got ${typeof argv}`);
  }
  const contextYargv = this && this.contextYargv;
  const commandGlob = _underToSlash((contextYargv.unlisted || vlm.isCompleting)
      ? _valmaGlobFromCommandPrefix(command, contextYargv.unlisted)
      : _valmaGlobFromCommand(command || "*"));
  const isWildCardCommand = !command || (command.indexOf("*") !== -1);
  const activeCommands = {};
  let show = {
    list: contextYargv.list,
    info: contextYargv.info,
    describe: contextYargv.describe,
    version: contextYargv.version,
    help: contextYargv.help,
  };
  if (!show.list && !show.info && !show.describe && !show.version && !show.help) show = undefined;

  // Phase 3: filter available command pools against the command glob
  if (vlm.verbosity >= 2) {
    console.log("vlm chatty: phase 3, commandGlob:", commandGlob, argv, "\n\tshow:", show);
  }

  for (const pool of activePools) {
    pool.commands = {};
    pool.listing.forEach(file => {
      // console.log("matching:", _isDirectory(file), _underToSlash(file.name), commandGlob, ": ",
      //    minimatch(_underToSlash(file.name), commandGlob, { dot: contextYargv.unlisted }));
      if (_isDirectory(file)) return;
      if (!minimatch(_underToSlash(file.name), commandGlob, { dot: contextYargv.unlisted })) return;
      const commandName = _valmaCommandFromPath(file.name);
      pool.commands[commandName] = {
        commandName, pool, file,
        modulePath: path.posix.join(pool.absolutePath, file.name),
      };
      if (activeCommands[commandName]) return;
      const activeCommand = activeCommands[commandName] = pool.commands[commandName];
      if (vlm.isCompleting || !shell.test("-e", activeCommand.modulePath)) return;
      const module = activeCommand.module = require(activeCommand.modulePath);
      if (vlm.verbosity >= 3) {
        console.log("vlm voluble: phase 3.5, pool.absolutePath:", pool.absolutePath,
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

  if (vlm.isCompleting || contextYargv.bashCompletion) {
    yargs.completion("bash-completion", (current, argvSoFar) => {
      const rule = _underToSlash(_valmaGlobFromCommandPrefix(argvSoFar._[1], argvSoFar.unlisted));
      const ret = [].concat(...activePools.map(pool => pool.listing
          .filter(node => !_isDirectory(node) && minimatch(_underToSlash(node.name || ""), rule,
              { dot: argvSoFar.unlisted }))
          .map(node => _valmaCommandFromPath(node.name))));
      return ret;
    });
    yargs.parse(contextYargv.bashCompletion ? ["bash-completion"] : process.argv.slice(2));
    return 0;
  }

  // Phase 4: perform the yargs run, possibly evaluating help, list etc. non-dispatch options.

  const commandArgs = argv.map(arg => JSON.stringify(arg)).join(" ");

  if (vlm.verbosity >= 2) {
    console.log("vlm chatty: phase 4: commandArgs: ", commandArgs,
        "\n\tactiveCommands:\n", Object.keys(activeCommands).map(
              key => `\n\t${key}: ${activeCommands[key].modulePath}`), "\n");
  }

  if (!command && !show) return _outputSimpleUsage(contextYargv, commandGlob);
  if (show) {
    if (show.help) {
      yargs.showHelp("log");
      return 0;
    }
    let infos;
    let align = 0;
    let versionAlign = 0;
    if (!command && !contextYargv.list) {
      infos = [{
        name: "vlm",
        module: valmaCommandExports,
        info: _commandInfo(__filename, path.dirname(process.argv[1]))
      }];
    } else {
      Object.keys(activeCommands).forEach(n => { if (n.length > align) align = n.length; });
      infos = Object.values(activeCommands).map((activeCommand) => {
        if (!activeCommand) return {};
        const info = _commandInfo(activeCommand.modulePath, activeCommand.pool.path);
        if (info[0].length > versionAlign) versionAlign = info[0].length;
        return { name: activeCommand.commandName, module: activeCommand.module, info };
      });
    }
    infos.sort((l, r) => l.name < r.name);
    infos.forEach(({ name, module, info }) => {
      if (info) {
        if (show.info) {
          _outputCommandInfo([[name, align], "|", [info[0], versionAlign], "|", ...info.slice(1)]);
        } else if (show.version) {
          console.log(info[0]);
        }
        if (show.describe && module && module.describe) {
          console.log();
          console.log(module.describe);
          console.log();
        }
      }
    });
    process.exit(0);
  }

  if (!Object.keys(activeCommands).length && !isWildCardCommand) {
    console.log(`vlm: cannot find command '${command}' from pools:`,
    ...activePools.map(emptyPool => `"${path.posix.join(emptyPool.path, commandGlob)}"`));
    return -1;
  }

  // Phase 5: Dispatch the command(s)

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
      const subYargs = module.builder(optionsYargs);
      if (!subYargs) {
        if (vlm.verbosity >= 1) {
          console.log("vlm warning: skipping disabled command", matchingCommand,
              "(its builder returns falsy)");
        }
        continue;
      }
      const subYargv = subYargs.parse(subCommand, { vlm: Object.create(vlm) });
      if (vlm.verbosity >= 3) {
        console.log("vlm voluble: phase 5: forwarding to:", subCommand,
            "\n\tsubArgv:", subYargv,
            "\n\tinteractives:", interactiveOptions);
      }
      subYargv.vlm.contextYargv = subYargv;
      await _tryInteractive(subYargv, interactiveOptions);
      if (vlm.echo && (matchingCommand !== command)) console.log("    ->> vlm", subCommand);
      await module.handler(subYargv);
      if (vlm.echo && (matchingCommand !== command)) console.log("    <<- vlm", subCommand);
      delete activeCommands[matchingCommand];
    }
  }
  return 0;
}

function _sharedYargs (yargs_, strict = true) {
  return yargs_
      .strict(strict)
      .help(false)
      .version(false)
      .wrap(yargs_.terminalWidth() < 140 ? yargs_.terminalWidth() : 140)
      .group("help", "Shared options:")
      .group("version", "Shared options:")
      .option({
        version: {
          group: "Shared options:",
          type: "boolean", default: false, global: true,
          description: "Show the version of the matching command(s)",
        },
        v: {
          group: "Shared options:",
          alias: "verbose", count: true, global: true,
          description: "Be noisy. -vv... -> be more noisy.",
        },
        u: {
          group: "Shared options:",
          alias: "unlisted", type: "boolean", default: false, global: true,
          description: "Includes unlisted sub-command(s) in matching",
        },
        h: {
          group: "Shared options:",
          alias: "help", type: "boolean", default: false, global: true,
          description: "Show the help block of the matching sub-command(s)",
        },
        l: {
          group: "Shared options:",
          alias: "list", type: "boolean", default: false, global: true,
          description: "Only list the matching sub-command(s)",
        },
        i: {
          group: "Shared options:",
          alias: "info", type: "boolean", default: false, global: true,
          description: "Show the info block of the matching sub-command(s)",
        },
        d: {
          group: "Shared options:",
          alias: "describe", type: "boolean", default: false, global: true,
          description: "Show the description block of the matching sub-command(s)",
        },
      });
}

function _parseUntilCommand (yargs_, argv_, commandKey = "command") {
  const commandIndex = argv_.findIndex(arg => (arg[0] !== "-"));
  const ret = yargs_.parse(argv_.slice(0, (commandIndex + 1) || undefined));
  if ((commandIndex !== -1) && (ret[commandKey] === undefined)) {
    if (ret._[0]) ret[commandKey] = ret._[0];
    else {
      throw new Error(`vlm error: malformed arguments: '${commandKey
          }' missing but command-like argument '${argv_[commandIndex]
          }' found (maybe provide flag values with '=' syntax?)`);
    }
  }
  ret.vlm = yargs_.vlm;
  ret._ = argv_.slice(commandIndex + 1);
  return ret;
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

function _outputCommandInfo (elements) {
  console.log(...elements.map(
      entry => (Array.isArray(entry) ? _rightpad(entry[0], entry[1]) : entry)));
}

function _rightpad (text, align = 0) {
  const pad = align - text.length;
  return `${text}${" ".repeat(pad < 0 ? 0 : pad)}`;
}

function _refreshActivePools (tryShortCircuit) {
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
    const shortCircuit = tryShortCircuit
        && tryShortCircuit(pool, poolHasVLM, specificEnoughVLMSeen);
    if (shortCircuit) return shortCircuit;
  }
  return undefined;
}

function _forwardToValmaInPool (pool, needNodeEnv) {
  if (!process.env.VLM_PATH) {
    process.env.VLM_PATH = pool.absolutePath;
    process.env.PATH = `${pool.absolutePath}:${process.env.PATH}`;
  }
  if (!process.env.VLM_GLOBAL_POOL && globalYargv.globalPool) {
    process.env.VLM_GLOBAL_POOL = globalYargv.globalPool;
  }
  const vlmPath = path.posix.join(pool.absolutePath, "vlm");
  let childProcess;
  if (needNodeEnv) {
    const argString = processArgv.map(a => JSON.stringify(a)).join(" ");
    if (vlm.verbosity) {
      console.log(`vlm inform: forwarding via spawn: "npx -c '${vlmPath} ${argString}'"`);
    }
    childProcess = spawn("npx", ["-c", `${vlmPath} ${argString}`],
        { env: process.env, stdio: ["inherit", "inherit", "inherit"], detached: true });
  } else {
    if (vlm.verbosity) {
      console.log(`vlm inform: forwarding via spawn: "${vlmPath}`, ...processArgv, `"`);
    }
    childProcess = spawn(vlmPath, processArgv,
        { env: process.env, stdio: ["inherit", "inherit", "inherit"], detached: true });
  }
  if (childProcess) {
    process.on("SIGINT", () => {
      childProcess.kill();
    });
  }
}

function matchPoolCommandNames (command) {
  const minimatcher = _underToSlash(_valmaGlobFromCommand(command || "*"));
  const ret = [].concat(...activePools.map(pool => pool.listing
      .map(file => _underToSlash(file.name))
      .filter(name => {
        const ret_ = minimatch(name, minimatcher, { dot: vlm.unlisted });
        return ret_;
      })
      .map(name => _valmaCommandFromPath(name))
  )).filter((v, i, a) => (a.indexOf(v) === i));
  if (vlm.verbosity >= 2) {
    console.log("vlm chatty: matchPoolCommandNames", command,
        "\n\tminimatcher:", minimatcher,
        "\n\tresults:", ret);
  }
  return ret;
}

function executeExternal (executable, argv = [], spawnOptions = {}) {
  return new Promise((resolve, failure) => {
    _flushPendingConfigWrites();
    if (vlm.echo) console.log("    -->", executable, ...argv);
    const subprocess = spawn(executable, argv,
        Object.assign({ env: process.env, stdio: ["inherit", "inherit", "inherit"] }, spawnOptions)
    );
    subprocess.on("exit", (code, signal) => {
      if (code || signal) failure(code || signal);
      else {
        _refreshActivePools();
        _reloadPackageAndValmaConfigs();
        if (vlm.echo) console.log("    <--", executable, ...argv);
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
  if (!vlm.interactive) return subYargv;
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
    if (!question.message) question.message = option.summary || option.description;
    if (!question.choices && option.choices) question.choices = option.choices;
    if (option.default !== undefined) {
      if (!["list", "checkbox"].includes(question.type)) {
        question.default = option.default;
      } else {
        const oldChoices = [];
        (Array.isArray(option.default) ? option.default : [option.default]).forEach(default_ => {
          if (!question.choices || !question.choices.includes(default_)) oldChoices.push(default_);
        });
        question.choices = oldChoices.concat(question.choices || []);
        if (question.type === "list") {
          question.default = question.choices.indexOf(option.default);
        } else if (question.type === "checkbox") {
          question.default = option.default;
        }
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
  if (vlm.verbosity) console.log("vlm inform: package.json updates:", updates);
}

function updateValmaConfig (updates) {
  if (!vlm.valmaConfig) {
    vlm.valmaConfig = {};
    valmaConfigStatus.updated = true;
  }
  _deepAssign(vlm.valmaConfig, updates, valmaConfigStatus);
  if (vlm.verbosity) console.log("vlm inform: valma.json updates:", updates);
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
    if (vlm.verbosity) {
      console.log("vlm inform: repository configuration updated, writing package.json");
    }
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
    if (vlm.verbosity) {
      console.log("vlm inform: valma configuration updated, writing valma.json");
    }
    const valmaConfigString = JSON.stringify(vlm.valmaConfig, null, 2);
    shell.ShellString(valmaConfigString).to(valmaConfigStatus.path);
    valmaConfigStatus.updated = false;
  }
}
