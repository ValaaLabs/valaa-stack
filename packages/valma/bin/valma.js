#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const inquirer = require("inquirer");
const minimatch = require("minimatch");
const path = require("path");
const shell = require("shelljs");
const semver = require("semver");
const yargs = require("yargs");
const cardinal = require("cardinal");
cardinal.tomorrowNight = require("cardinal/themes/tomorrow-night");

/* eslint-disable vars-on-top, no-loop-func, no-restricted-syntax, no-cond-assign,
                  import/no-dynamic-require
*/

/*
   #    ######    ###
  # #   #     #    #
 #   #  #     #    #
#     # ######     #
####### #          #
#     # #          #
#     # #         ###
*/

const nodeCheck = ">=8.10.0";
const npmCheck = ">=5.0.0";

const defaultPaths = {
  packagePool: path.posix.resolve("localbin/"),
  dependedPoolSubdirectory: "node_modules/.bin/",
  globalPool: process.env.VLM_GLOBAL_POOL || (shell.which("vlm") || "").slice(0, -3),
};

// vlm - the Valma global API singleton - these are available to all command scripts via both
// yargs.vlm (in scripts exports.builder) as well as yargv.vlm (in scripts exports.handler).
const vlm = yargs.vlm = {
  // Calls valma sub-command with argv.
  callValma,

  // Executes an external command and returns a promise of the command stdandard output as string.
  executeExternal,

  // Contents of package.json (contains pending updates as well)
  packageConfig: undefined,

  // Contents of valma.json (contains pending updates as well)
  valmaConfig: undefined,

  // Registers pending updates to the package.json config file (immediately available in
  // vlm.packageConfig) which are written to file only immediately before valma execution exits or
  // an external command is about to be executed.
  // TODO(iridian): Improve the flush semantics, maybe to flush-on-subcommand-success - now it's
  // just silly.
  updatePackageConfig,

  // Registers pending updates to the valma.json config file (immediately available in
  // vlm.valmaConfig) which are written to file only immediately before valma execution exits or
  // an external command is about to be executed.
  // TODO(iridian): Improve the flush semantics, maybe to flush-on-subcommand-success - now it's
  // just silly.
  updateValmaConfig,

  // Returns a list of available sub-command names which match the given command glob.
  listMatchingCommands,
  listMatchingUnlistedCommands,

  // Opens interactive inquirer prompt and returns a completion promise.
  // See https://github.com/SBoudrias/Inquirer.js/
  inquire: inquirer.createPromptModule(),

  // shelljs namespace of portable Unix commands
  // See https://github.com/shelljs/shelljs
  shell,

  // semver namespace of the npm semver parsing tools
  // See https://github.com/npm/node-semver
  semver,

  // minimatch namespace of the glob matching tools
  // See https://github.com/isaacs/minimatch
  minimatch,

  // node.js path.posix tools - all shell commands expect posix-style paths.
  // See https://nodejs.org/api/path.html
  path: path.posix,

  // minimatch namespace of the glob matching tools
  // See https://github.com/isaacs/minimatch
  cardinal,
};

const valmaExports = {
  command: "vlm [-<flags>] [--<option>=<value> ...] <command> [parameters]",
  summary: "Dispatch a valma command to its command script",
  describe: `Valma (or 'vlm') is a command script dispatcher.

Any npm package which exports scripts prefixed with 'valma-' (or
'.valma-' for unlisted scripts) in their package.json bin section is
called a valma module. The corresponding command name of a script is
the name stripped of 'valma-' and all '_' converted to '/'. When such
a module is added as a devDependency for a package, valma will then be
able to locate and dispatch calls to those scripts when called from
inside that package.

There are two types of valma scripts: listed and unlisted.
Listed scripts can be seen with 'vlm' or 'vlm --help'. They are
intended to be called directly from the command line. Unlisted scripts
are all valma scripts whose name begins with a '.' (or any of their
path parts for nested scripts). These scripts can still be called with
valma normally but are intended to be used indirectly by other valma
scripts.

Note: valma treats the underscore '_' equal to '/' in all command
pattern matching contexts. While use of '_' is otherwise optional, it
is specifically mandatory to use '_' inside the package.json bin
section export names (npm doesn't support bin '/' or at least not
sharing the folders between separate packages).`,

  builder: (yargs_) => yargs_
  //    .usage(valmaExports.command, valmaExports.summary, iy => iy)
      .options({
        v: {
          group: "Introspection options:",
          alias: "verbose", count: true, global: false,
          description: "Be noisy. -vv... -> be more noisy.",
        },
        p: {
          group: "Introspection options:",
          alias: "pools", type: "boolean", default: false, global: false,
          description: "Separate commands by pools (highest priority pool last)",
        },
        echo: {
          group: "Introspection options:",
          type: "boolean", default: true, global: false,
          description: "Echo all external and sub-command calls with their return values",
        },
        "bash-completion": {
          group: "Introspection options:",
          type: "boolean", global: false,
          description: "Output bash completion script",
        },
        u: {
          group: "Execution options:",
          alias: "unlisted", type: "boolean", default: false, global: false,
          description: "Include unlisted and disabled commands in /all/ matchings",
        },
        interactive: {
          group: "Execution options:",
          type: "boolean", default: true, global: false,
          description: "Prompt for missing required fields",
        },
        promote: {
          group: "Execution options:",
          type: "boolean", default: true, global: false,
          description: "Promote to 'vlm' in the most specific pool available",
        },
        "node-env": {
          group: "Execution options:",
          type: "boolean", default: true, global: false,
          description: "Add node environment if it is missing",
        },
        "package-pool": {
          group: "Execution options:",
          type: "string", default: defaultPaths.packagePool, global: false,
          description: "Package pool path is the first pool to be searched",
        },
        "depended-pool-subdirectory": {
          group: "Execution options:",
          type: "string", default: defaultPaths.dependedPoolSubdirectory, global: false,
          description: "Depended pools are all package-pool parents with this sub-directory",
        },
        "global-pool": {
          group: "Execution options:",
          type: "string", default: defaultPaths.globalPool || null, global: false,
          description: "Global pool path is the last pool to be searched",
        },
      }),
  handler, // Defined below.
};

function _sharedYargs (yargs_, strict = true) {
  return yargs_
      .strict(strict)
      .help(false)
      .version(false)
      .wrap(yargs_.terminalWidth() < 140 ? yargs_.terminalWidth() : 140)
      .group("help", "Introspection options:")
      .group("version", "Introspection options:")
      .option({
        l: {
          group: "Introspection options:",
          alias: "list", type: "boolean", default: false, global: true,
          description: "Only shows the matching command(s) without executing them",
        },
        h: {
          group: "Introspection options:",
          alias: "help", type: "boolean", default: false, global: true,
          description: "Show the main help of the command",
        },
        r: {
          group: "Introspection options:",
          alias: "version", type: "boolean", default: false, global: true,
          description: "Show the version of the matching command(s)",
        },
        s: {
          group: "Introspection options:",
          alias: "summary", type: "boolean", default: false, global: true,
          description: "Show the summary of the command(s)",
        },
        i: {
          group: "Introspection options:",
          alias: "info", type: "boolean", default: false, global: true,
          description: "Show the info block of the command(s)",
        },
        d: {
          group: "Introspection options:",
          alias: "describe", type: "boolean", default: false, global: true,
          description: "Show the description of the command(s)",
        },
        c: {
          group: "Introspection options:",
          alias: "code", type: "boolean", default: false, global: true,
          description: "Show the script code of the command(s)",
        },
      });
}

/*
  ###                               ##
   #     #    #     #     #####    #  #      #    #    ##       #    #    #
   #     ##   #     #       #       ##       ##  ##   #  #      #    ##   #
   #     # #  #     #       #      ###       # ## #  #    #     #    # #  #
   #     #  # #     #       #     #   # #    #    #  ######     #    #  # #
   #     #   ##     #       #     #    #     #    #  #    #     #    #   ##
  ###    #    #     #       #      #### #    #    #  #    #     #    #    #
*/

vlm.isCompleting = (process.argv[2] === "--get-yargs-completions");
const processArgv = vlm.isCompleting ? process.argv.slice(3) : process.argv.slice(2);

_sharedYargs(yargs, !vlm.isCompleting);
const globalYargs = valmaExports.builder(yargs);
const globalYargv = _parseUntilCommand(globalYargs, processArgv, "command");

if (!vlm.isCompleting) {
  vlm.verbosity = globalYargv.verbose;
  vlm.interactive = globalYargv.interactive;
  vlm.echo = globalYargv.echo;
}

if (vlm.verbosity >= 2) {
  console.log("vlm chatty: phase 1, argv:", JSON.stringify(process.argv),
      "\n\tcommand:", globalYargv.command, JSON.stringify(globalYargv._));
  if (vlm.verbosity >= 3) {
    console.log("vlm voluble: globalYargv:", globalYargv);
  }
}

const availablePools = [];
// When a command begins with ./ or contains valma- it is considered a direct file valma command.
// It's parent directory is made the initial "file" pool, replacing the "package" pool of regular
// valma commands. The depended pools are searched from this path.
if ((globalYargv.command || "").includes("valma-")
    || (globalYargv.command || "").slice(0, 2) === "./") {
  if (globalYargv.isCompleting) process.exit(0); // Let bash filename completion do its thing.
  const match = globalYargv.command.match(/(.*\/)?(\.?)valma-(.*?)(.js)?$/);
  globalYargv.command = match ? `${match[2]}${match[3]}` : "";
  const filePoolPath = path.posix.resolve((match && match[1]) || "");
  availablePools.push({ name: "file", path: filePoolPath });
} else {
  availablePools.push({ name: "package", path: globalYargv.packagePool });
}
availablePools.push(..._locateDependedPools(
    availablePools[0].path, globalYargv.dependedPoolSubdirectory));
availablePools.push(  { name: "global", path: globalYargv.globalPool });

let activePools = [];

const packageConfigStatus = {
  path: path.posix.join(process.cwd(), "package.json"), updated: false,
};
const valmaConfigStatus = {
  path: path.posix.join(process.cwd(), "valma.json"), updated: false,
};


vlm.contextYargv = globalYargv;
valmaExports
    .handler(globalYargv)
    .then(result => (result !== undefined) && process.exit(result));

// Only function definitions from hereon.

async function handler (yargv) {
  // Phase 1: Pre-load args with so-far empty pools to detect fully builtin commands (which don't
  // need forwarding).
  const fullyBuiltin = vlm.isCompleting || !yargv.command;

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
    vlm.contextYargv = globalYargv;
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
  await maybeRet;

  _flushPendingConfigWrites();
  return 0;
}

/*
                                #     #
  ####     ##    #       #      #     #    ##    #       #    #    ##
 #    #   #  #   #       #      #     #   #  #   #       ##  ##   #  #
 #       #    #  #       #      #     #  #    #  #       # ## #  #    #
 #       ######  #       #       #   #   ######  #       #    #  ######
 #    #  #    #  #       #        # #    #    #  #       #    #  #    #
  ####   #    #  ######  ######    #     #    #  ######  #    #  #    #
*/

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
  const contextVLM = this || vlm;
  const contextYargv = this && this.contextYargv;
  const commandGlob = _underToSlash((contextYargv.unlisted || contextVLM.isCompleting)
      ? _valmaGlobFromCommandPrefix(command, contextYargv.unlisted)
      : _valmaGlobFromCommand(command || "*"));
  const isWildCardCommand = !command || (command.indexOf("*") !== -1);
  const activeCommands = {};
  const introspect = _extractIntrospectOptions(valmaExports, contextYargv, command,
      isWildCardCommand);

  // Phase 3: filter available command pools against the command glob
  if (contextVLM.verbosity >= 2) {
    console.log("vlm chatty: phase 3, commandGlob:", commandGlob, argv,
        "\n\tintrospect:", introspect);
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
        modulePath: path.posix.join(pool.path, file.name),
      };
      if (activeCommands[commandName]) return;
      const activeCommand = pool.commands[commandName];
      if (!contextVLM.isCompleting && shell.test("-e", activeCommand.modulePath)) {
        const module = activeCommand.module = require(activeCommand.modulePath);
        if (contextVLM.verbosity >= 3) {
          console.log("vlm voluble: phase 3.5, module:", activeCommand.modulePath,
              ", file.name:", file.name);
        }
        if (module && (module.command !== undefined) && (module.describe !== undefined)
            && (module.handler !== undefined)) {
          const builder = ((!module.disabled
                  || ((typeof module.disabled === "function") && !module.disabled(yargs)))
              && module.builder) || undefined;
          activeCommand.disabled = !builder;
          if (!builder && !contextYargv.unlisted) return undefined;
          yargs.command(module.command, module.summary || module.describe, builder, () => {});
        } else if (!introspect && !contextYargv.list) {
          throw new Error(`vlm: invalid script module '${activeCommand.modulePath
              }', export 'command', 'describe' or 'handler' missing`);
        }
      }
      activeCommands[commandName] = activeCommand;
    });
  }

  if (contextVLM.isCompleting || contextYargv.bashCompletion) {
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

  if (contextVLM.verbosity >= 2) {
    console.log("vlm chatty: phase 4: commandArgs: ", commandArgs,
        "\n\tactiveCommands:\n", ...Object.keys(activeCommands).map(
              key => `\n\t${key}: ${activeCommands[key].modulePath}`),
        "\n\tcontextYargv:", contextYargv);
  }

  if (introspect) {
    let introspectedCommands = activeCommands;
    if (!command && introspect.entryIntro && !contextYargv.list) {
      delete introspect.name;
      introspectedCommands = { vlm: {
        commandName: "vlm", module: valmaExports, modulePath: __filename,
        pool: { path: path.dirname(process.argv[1]) }
      } };
    }
    const ret = _outputIntrospection(introspect, introspectedCommands, commandGlob);
    return isWildCardCommand ? ret : ret[0];
  }

  if (!isWildCardCommand && !Object.keys(activeCommands).length) {
    console.log(`vlm: cannot find command '${command}' from active pools:`,
        ...activePools.map(activePool => `"${path.posix.join(activePool.path, commandGlob)}"`));
    return -1;
  }

  // Phase 5: Dispatch the command(s)

  const listedCommands = contextYargv.list && {};
  let ret = [];

  // Reverse to have matching global command names execute first (while obeying overrides)
  for (const activePool of activePools.slice().reverse()) {
    for (const matchingCommand of Object.keys(activePool.commands).sort()) {
      const activeCommand = activeCommands[matchingCommand];
      if (!activeCommand) continue;
      const module = activeCommand.module;
      delete activeCommands[matchingCommand];
      if (!module) {
        if (listedCommands) listedCommands[matchingCommand] = activeCommand;
        else {
          console.error("vlm error: trying to execute command", matchingCommand,
          "link missing its target at", activeCommand.modulePath);
        }
        continue;
      }
      const subVLM = Object.create(contextVLM);
      let subYargs = Object.create(yargs);
      subYargs.vlm = subVLM;
      const interactiveOptions = {};
      // Hook to yargs.option/options calls so we can extract the interactive options.
      subYargs.option = subYargs.options = (opt, attributes) => {
        if (typeof opt === "object") {
          Object.keys(opt).forEach(key => subYargs.option(key, opt[key]));
          return subYargs;
        }
        if (attributes.interactive) interactiveOptions[opt] = attributes;
        return yargs.options(opt, attributes);
      };
      yargs.help().command(module.command, module.describe);
      const subCommand = `${matchingCommand} ${commandArgs}`;
      subYargs = (!module.disabled
            || ((typeof module.disabled === "function") && module.disabled(subYargs)))
          && module.builder(subYargs);
      if (listedCommands) {
        listedCommands[matchingCommand] = { ...activeCommand, disabled: !subYargs };
        continue;
      }
      if (!subYargs) {
        if (!isWildCardCommand || (contextVLM.verbosity >= 1)) {
          console.log(`vlm warning: skipping disabled command '${matchingCommand
              }' (its exports.builder returns falsy)`);
        }
        continue;
      }
      const subYargv = subYargs.parse(subCommand, { vlm: subVLM });
      const subIntrospect = _extractIntrospectOptions(module, subYargv, subCommand);
      if (subIntrospect) {
        ret = ret.concat(
            _outputIntrospection(subIntrospect, { [matchingCommand]: activeCommand }, command));
      } else {
        if (contextVLM.verbosity >= 3) {
          console.log("vlm voluble: phase 5: forwarding to:", subCommand,
              "\n\tsubArgv:", subYargv,
              "\n\tinteractives:", interactiveOptions);
        }
        subYargv.vlm.contextYargv = subYargv;
        await _tryInteractive(subYargv, interactiveOptions);
        if (contextVLM.echo && (matchingCommand !== command)) {
          console.log("    ->> vlm", subCommand);
        }
        ret.push(await module.handler(subYargv));
        if (contextVLM.echo && (matchingCommand !== command)) {
          let retValue = JSON.stringify(ret[ret.length - 1]);
          if (retValue === undefined) retValue = "undefined";
          console.log("    <<- vlm", subCommand,
              ":", retValue.slice(0, 20), retValue.length > 20 ? "..." : "");
        }
      }
    }
  }
  if (listedCommands) {
    _outputIntrospection({ info: true }, listedCommands, command);
  }
  return isWildCardCommand ? ret : ret[0];
}

/*
######
#     #  ######   #####    ##       #    #
#     #  #          #     #  #      #    #
#     #  #####      #    #    #     #    #
#     #  #          #    ######     #    #
#     #  #          #    #    #     #    #
######   ######     #    #    #     #    ######
*/

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
  return showUnlisted && !((commandPrefix || "")[0] === ".")
      ? `{.,}valma-${commandPrefix || ""}{,*/**/}*`
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

function _outputCommandInfo (elements) {
  console.log(...elements.map(
      entry => (Array.isArray(entry) ? _rightpad(entry[0], entry[1]) : entry)));
}

function _rightpad (text, align = 0) {
  const pad = align - text.length;
  return `${text}${" ".repeat(pad < 0 ? 0 : pad)}`;
}

function _locateDependedPools (initialPoolPath, subdirectory) {
  let pathBase = initialPoolPath;
  let name = "depended";
  const ret = [];
  while (pathBase && (pathBase !== "/")) {
    pathBase = path.posix.join(pathBase, "..");
    const poolPath = path.posix.join(pathBase, subdirectory);
    if (shell.test("-d", poolPath)) ret.push({ name, path: poolPath });
    name = `${name}/..`;
  }
  return ret;
}

function _refreshActivePools (tryShortCircuit) {
  activePools = [];
  let specificEnoughVLMSeen = false;
  for (const pool of availablePools) {
    if (!pool.path || !shell.test("-d", pool.path)) continue;
    let poolHasVLM = false;
    pool.listing = shell.ls("-lAR", pool.path)
        .filter(file => {
          if (file.name.slice(0, 5) === "valma" || file.name.slice(0, 6) === ".valma") return true;
          if (file.name === "vlm") poolHasVLM = true;
          return false;
        });
    activePools.push(pool);
    if (process.argv[1].indexOf(pool.path) === 0) specificEnoughVLMSeen = true;
    const shortCircuit = tryShortCircuit
        && tryShortCircuit(pool, poolHasVLM, specificEnoughVLMSeen);
    if (shortCircuit) return shortCircuit;
  }
  return undefined;
}

function _forwardToValmaInPool (pool, needNodeEnv) {
  if (!process.env.VLM_PATH) {
    process.env.VLM_PATH = pool.path;
    process.env.PATH = `${pool.path}:${process.env.PATH}`;
  }
  if (!process.env.VLM_GLOBAL_POOL && globalYargv.globalPool) {
    process.env.VLM_GLOBAL_POOL = globalYargv.globalPool;
  }
  const vlmPath = path.posix.join(pool.path, "vlm");
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
    // These don't actually do anything? The forwarded valma process dies to ctrl-c anyway.
    process.on("SIGTERM", () => { childProcess.kill("SIGTERM"); });
    process.on("SIGINT", () => { childProcess.kill("SIGINT"); });
  }
}

function listMatchingCommands (command, matchUnlisted = false) {
  const minimatcher = _underToSlash(_valmaGlobFromCommand(command || "*"));
  const ret = [].concat(...activePools.map(pool => pool.listing
      .map(file => _underToSlash(file.name))
      .filter(name => {
        const ret_ = minimatch(name, minimatcher, { dot: matchUnlisted });
        return ret_;
      })
      .map(name => _valmaCommandFromPath(name))
  )).filter((v, i, a) => (a.indexOf(v) === i));
  if (vlm.verbosity >= 2) {
    console.log("vlm chatty:",
        matchUnlisted ? "listMatchingCommands" : "listMatchingUnlistedCommands", command,
        "\n\tminimatcher:", minimatcher,
        "\n\tresults:", ret);
  }
  return ret;
}

function listMatchingUnlistedCommands (command) {
  return listMatchingCommands.call(this, command, true);
}

function executeExternal (executable, argv = [], spawnOptions = {}) {
  return new Promise((resolve, failure) => {
    _flushPendingConfigWrites();
    if (vlm.echo) console.log("    -->", executable, ...argv);
    const subProcess = spawn(executable, argv,
        Object.assign({ env: process.env, stdio: ["inherit", "inherit", "inherit"] }, spawnOptions)
    );
    subProcess.on("exit", (code, signal) => {
      if (code || signal) failure(code || signal);
      else {
        _refreshActivePools();
        _reloadPackageAndValmaConfigs();
        if (vlm.echo) console.log("    <--", executable, ...argv);
        resolve();
      }
    });
    subProcess.on("error", failure);
    process.on("SIGTERM", () => { subProcess.kill("SIGTERM"); });
    process.on("SIGINT", () => { subProcess.kill("SIGINT"); });
  });
}

function _extractIntrospectOptions (module, yargv, command, isWildcard) {
  const entryIntro
      = yargv.version || yargv.summary || yargv.info || yargv.code || yargv.describe;
  if (command && !yargv.help && !entryIntro) return undefined;
  const usage = !command && !entryIntro;
  return {
    module,
    usage,
    help: yargv.help,
    name: isWildcard,
    // entry intro section
    entryIntro,
    version: yargv.version,
    summary: yargv.summary || usage,
    info: yargv.info,
    code: yargv.code,
    describe: yargv.describe,
  };
}

function _outputIntrospection (introspect, commands, commandGlob) {
  if (introspect.help) {
    yargs.vlm = vlm;
    yargs.showHelp("log");
    return [];
  }
  if (introspect.usage) {
    console.log("# Simple usage:", introspect.module.command);
    console.log();
    console.log(`# Available commands${globalYargv.unlisted ? " (incl. unlisted)" : ""}:`);
  }
  if (!globalYargv.pools) {
    return _outputInfos(commands);
  }
  for (const pool of [...activePools].reverse()) {
    if (!Object.keys(pool.commands).length) {
      console.log(`## Pool ${pool.name}' empty (matching "${pool.path}${commandGlob}")`);
    } else {
      console.log(`## Pool ${pool.name}' commands (matching "${pool.path}${commandGlob}"):`);
      _outputInfos(pool.commands, pool.path);
      console.log();
    }
  }

  function _outputInfos (commands, poolPath) {
    let nameAlign = 0;
    let versionAlign = 0;
    const infos = Object.keys(commands)
    .sort()
    .map((commandName) => {
      const command = commands[commandName];
      if (!command || (command.disabled && !contextYargv.unlisted)) return {};
      const nameLength = commandName.length + (command.disabled ? 2 : 0);
      if (nameLength > nameAlign) nameAlign = nameLength;
      const info = _commandInfo(command.modulePath, poolPath || command.pool.path);
      if (info[0].length > versionAlign) versionAlign = info[0].length;
      return { name: commandName, module: command.module, info };
    });
    if (introspect.name) {
      const headers = [
        ...(introspect.name ? [_rightpad("command", nameAlign), "|"] : []),
        ...(introspect.summary ? [_rightpad("summary", 71), "|"] : []),
        ...(introspect.version ? [_rightpad("version", versionAlign), "|"] : []),
        ...(introspect.info ? ["package | pool | path", "|"] : []),
      ];
      console.log(...headers.slice(0, -1));
      console.log(...headers.slice(0, -1).map(h => h === "|" ? "|" : h.replace(/./g, "-")));
    }
    infos.map(({ name, module, info }) => {
      if (!info) return undefined;
      let ret = {};
      const name_ = commands[name].disabled ? `(${name})` : name;
      const infoRow = [
        ...(introspect.name ? ["|", [(ret.name = name_), nameAlign]] : []),
        ...(introspect.summary ? ["|", [(ret.summary = !module
              ? "<script file not found>"
              : module.summary
                  || module.describe.match(/^(.[^\n]*)/)[1].slice(0, 71).replace(/\|/g, ";")), 71]]
          : []),
        ...(introspect.version ? ["|", [(ret.version = info[0]), versionAlign]] : []),
        ...(introspect.info ? ["|", (ret.info = info.slice(1)).join(" | ")] : []),
      ];
      _outputCommandInfo(infoRow.slice(1));
      if (introspect.code) {
        if (shell.test("-f", info[3])) {
          const scriptSource = String(shell.head({ "-n": 1000000 }, info[3]));
          console.log(cardinal.highlight(scriptSource,
              { theme: cardinal.tomorrowNight, linenos: true }));
        } else {
          console.log(`Cannot read command '${name}' script source from:`, info[3]);
        }
      } else if (introspect.describe && module && module.describe) {
        console.log();
        console.log(module.describe);
        console.log();
      }
      if (Object.keys(ret).length === 1) return ret[Object.keys(ret)[0]];
      return ret;
    }).filter(v => v);
  }
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
