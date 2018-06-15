#!/usr/bin/env node

const { spawn } = require("child_process");
const colors = require("colors/safe");
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
  localPool: path.posix.resolve("valma.bin/"),
  dependedPoolSubdirectory: "node_modules/.bin/",
  globalPool: process.env.VLM_GLOBAL_POOL || (shell.which("vlm") || "").slice(0, -3),
};

colors.command = (...rest) => colors.bold(colors.magenta(...rest));
colors.echo = (...rest) => colors.dim(...rest);
colors.warning = (...rest) => colors.red(...rest);
colors.error = (...rest) => colors.bold(colors.red(...rest));

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
  listAllMatchingCommands,

  // Enables usage of ANSI colors using the safe variant of Marak's colors
  // See https://github.com/Marak/colors.js
  colors,

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
'.valma-' for hidden scripts) in their package.json bin section is
called a valma module. The corresponding command name of a script is
the name stripped of 'valma-' and all '_' converted to '/'. When such
a module is added as a devDependency for a package, valma will then be
able to locate and dispatch calls to those scripts when called from
inside that package.

There are two types of valma scripts: listed and hidden.
Listed scripts can be seen with 'vlm' or 'vlm --help'. They are
intended to be called directly from the command line. Hidden scripts
are all valma scripts whose name begins with a '.' (or if any of their
path parts begins with it). These scripts can still be called with
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
          description: "Show separate pools (highest priority pool last)",
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
        a: {
          group: "Options:",
          alias: "match-all", type: "boolean", default: false, global: false,
          description: "Include unlisted and disabled commands in /all/ matchings",
        },
        interactive: {
          group: "Options:",
          type: "boolean", default: true, global: false,
          description: "Prompt for missing required fields",
        },
        promote: {
          group: "Options:",
          type: "boolean", default: true, global: false,
          description: "Promote to 'vlm' in the most specific pool available",
        },
        "node-env": {
          group: "Options:",
          type: "boolean", default: true, global: false,
          description: "Add node environment if it is missing",
        },
        "local-pool": {
          group: "Options:",
          type: "string", default: defaultPaths.localPool, global: false,
          description: "Local pool path is the first pool to be searched",
        },
        "depended-pool-subdirectory": {
          group: "Options:",
          type: "string", default: defaultPaths.dependedPoolSubdirectory, global: false,
          description: "Depended pools are all package-pool parents with this sub-directory",
        },
        "global-pool": {
          group: "Options:",
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
      .option({
        h: {
          group: "Introspection options:",
          alias: "help", type: "boolean", default: false, global: true,
          description: "Show the main help of the command",
        },
        d: {
          group: "Options:",
          alias: "dry-run", type: "boolean", default: false, global: true,
          description: "Do not execute but display all the matching command(s)",
        },
        U: {
          group: "Introspection options:",
          alias: "show-usage", type: "boolean", default: false, global: true,
          description: "Show the full usage of the matching command(s)",
        },
        V: {
          group: "Introspection options:",
          alias: "version", type: "boolean", default: false, global: true,
          description: "Show the version of the matching command(s)",
        },
        S: {
          group: "Introspection options:",
          alias: "show-summary", type: "boolean", default: false, global: true,
          description: "Show the summary of the command(s)",
        },
        I: {
          group: "Introspection options:",
          alias: "show-info", type: "boolean", default: false, global: true,
          description: "Show the info block of the command(s)",
        },
        D: {
          group: "Introspection options:",
          alias: "show-describe", type: "boolean", default: false, global: true,
          description: "Show the description of the command(s)",
        },
        C: {
          group: "Introspection options:",
          alias: "show-code", type: "boolean", default: false, global: true,
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
// It's parent directory is made the initial "file" pool, replacing the "local" pool of regular
// valma commands. The depended pools are searched from this path.
if ((globalYargv.command || "").includes("valma-")
    || (globalYargv.command || "").slice(0, 2) === "./") {
  if (globalYargv.isCompleting) process.exit(0); // Let bash filename completion do its thing.
  const match = globalYargv.command.match(/(.*\/)?(\.?)valma-(.*?)(.js)?$/);
  globalYargv.command = match ? `${match[2]}${match[3]}` : "";
  const filePoolPath = path.posix.resolve((match && match[1]) || "");
  availablePools.push({ name: "file", path: filePoolPath });
} else {
  availablePools.push({ name: "local", path: globalYargv.localPool });
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
    console.error(colors.error("vlm leaving: could not locate 'vlm' forward in any pool",
        "while trying to load node environment variables"));
    process.exit(-1);
  }

  if (!semver.satisfies(process.versions.node, nodeCheck)) {
    console.warn(colors.warning(
        `vlm warning: node ${nodeCheck} recommended, got`, process.versions.node));
  }

  const npmVersion = (process.env.npm_config_user_agent || "").match(/npm\/([^ ]*) /);
  if (npmVersion && !semver.satisfies(npmVersion[1], npmCheck)) {
    console.warn(colors.warning(
        `vlm warning: npm ${npmCheck} recommended, got`, npmVersion[1]));
  }

  _reloadPackageAndValmaConfigs();

  if (needNode && vlm.packageConfig) {
    console.warn(colors.warning(
        "vlm warning: could not load node environment"));
  }

  try {
    const subVLM = Object.create(vlm);
    subVLM.contextYargv = yargv;
    const maybeRet = subVLM.callValma(yargv.command, yargv._);
    subVLM.callValma = callValmaWithEcho;
    await maybeRet;

    _flushPendingConfigWrites(vlm);
  } catch (error) {
    console.error(colors.error("vlm error: caught exception:", error));
  }
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
  if (vlm.echo) console.log(colors.echo("    ->> vlm", command, ...argv));
  let ret;
  try {
    const ret = await callValma.call(this, command, argv);
    if (vlm.echo) {
      console.warn(colors.echo("    <<- vlm", command, ":",
          (JSON.stringify(ret) || "undefined").slice(0, 40)));
    }
    return ret;
  } catch (error) {
    console.warn(colors.warning("    <<- vlm", command, ": <error>:", error));
    throw error;
  }
}

async function callValma (command, argv = []) {
  if (!Array.isArray(argv)) {
    throw new Error(`vlm.callValma: argv must be an array, got ${typeof argv}`);
  }
  const contextVLM = this || vlm;
  const contextYargv = this && this.contextYargv;
  const commandGlob = _underToSlash((contextYargv.matchAll || contextVLM.isCompleting)
      ? _valmaGlobFromCommandPrefix(command, contextYargv.matchAll)
      : _valmaGlobFromCommand(command || "*"));
  const isWildCardCommand = !command || (command.indexOf("*") !== -1);
  const activeCommands = {};
  const introspect = _determineIntrospection(valmaExports, contextYargv, command,
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
      //    minimatch(_underToSlash(file.name), commandGlob, { dot: contextYargv.matchAll }));
      if (_isDirectory(file)) return;
      if (!minimatch(_underToSlash(file.name), commandGlob, { dot: contextYargv.matchAll })) return;
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
          if (!builder && !contextYargv.matchAll) return undefined;
          yargs.command(module.command, module.summary || module.describe,
              ...(builder ? [builder] : []), () => {});
        } else if (!introspect && !contextYargv.dryRun) {
          throw new Error(`vlm: invalid script module '${activeCommand.modulePath
              }', export 'command', 'describe' or 'handler' missing`);
        }
      }
      activeCommands[commandName] = activeCommand;
    });
  }

  if (contextVLM.isCompleting || contextYargv.bashCompletion) {
    yargs.completion("bash-completion", (current, argvSoFar) => {
      const rule = _underToSlash(_valmaGlobFromCommandPrefix(argvSoFar._[1], argvSoFar.matchAll));
      const ret = [].concat(...activePools.map(pool => pool.listing
          .filter(node => !_isDirectory(node) && minimatch(_underToSlash(node.name || ""), rule,
              { dot: argvSoFar.matchAll }))
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
        "\n\tactiveCommands: {", ...Object.keys(activeCommands).map(
              key => `\n\t\t${key}: ${activeCommands[key].modulePath}`),
        "\n\t}",
        ...(contextVLM.verbosity >= 3 ? ["\n\tcontextYargv:", contextYargv] : []));
  }

  if (introspect) {
    const ret = _outputIntrospection(introspect, activeCommands, commandGlob,
        contextYargv.matchAll);
    return isWildCardCommand ? ret : ret[0];
  }

  if (!isWildCardCommand && !Object.keys(activeCommands).length) {
    console.error(colors.error(`vlm: cannot find command '${command}' from active pools:`,
        ...activePools.map(activePool => `"${path.posix.join(activePool.path, commandGlob)}"`)));
    return -1;
  }

  // Phase 5: Dispatch the command(s)

  const dryRunCommands = contextYargv.dryRun && {};
  let ret = [];

  // Reverse to have matching global command names execute first (while obeying overrides)
  for (const activePool of activePools.slice().reverse()) {
    for (const matchingCommand of Object.keys(activePool.commands).sort()) {
      const activeCommand = activeCommands[matchingCommand];
      if (!activeCommand) continue;
      const module = activeCommand.module;
      delete activeCommands[matchingCommand];
      if (!module) {
        if (dryRunCommands) dryRunCommands[matchingCommand] = activeCommand;
        else {
          console.warn(colors.warning("vlm error: trying to execute command", matchingCommand,
              "which is missing its symlink target at", activeCommand.modulePath));
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
      const disabled = module.disabled
          && ((typeof module.disabled !== "function") || module.disabled(subYargs));
      subYargs = !disabled && module.builder(subYargs);
      if (dryRunCommands) {
        dryRunCommands[matchingCommand] = { ...activeCommand, disabled: !subYargs };
        continue;
      }
      if (!subYargs) {
        if (!isWildCardCommand || (contextVLM.verbosity >= 1)) {
          console.log(`vlm inform: skipping disabled command '${matchingCommand
              }' (its exports.builder returns falsy)`);
        }
        continue;
      }
      const subYargv = subYargs.parse(subCommand, { vlm: subVLM });
      const subIntrospect = _determineIntrospection(module, subYargv, subCommand);
      if (subIntrospect) {
        ret = ret.concat(
            _outputIntrospection(subIntrospect, { [matchingCommand]: activeCommand }, command,
                  subYargv.matchAll));
      } else {
        if (contextVLM.verbosity >= 3) {
          console.log("vlm voluble: phase 5: forwarding to:", subCommand,
              "\n\tsubArgv:", subYargv,
              "\n\tinteractives:", interactiveOptions);
        }
        subYargv.vlm.contextYargv = subYargv;
        await _tryInteractive(subYargv, interactiveOptions);
        if (contextVLM.echo && (matchingCommand !== command)) {
          console.log(colors.echo("    ->> vlm", subCommand));
        }
        ret.push(await module.handler(subYargv));
        if (contextVLM.echo && (matchingCommand !== command)) {
          let retValue = JSON.stringify(ret[ret.length - 1]);
          if (retValue === undefined) retValue = "undefined";
          console.log(colors.echo("    <<- vlm", subCommand,
              ":", retValue.slice(0, 20), retValue.length > 20 ? "..." : ""));
        }
      }
    }
  }
  if (dryRunCommands) {
    _outputIntrospection(_determineIntrospection(module, contextYargv),
        dryRunCommands, command, contextYargv.matchAll);
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

function _valmaGlobFromCommandPrefix (commandPrefix = "", matchAll) {
  return matchAll && !((commandPrefix || "")[0] === ".")
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
  console.log(...elements.map(entry => (Array.isArray(entry)
      ? (entry[2] || (i => i))(_rightpad(entry[0], entry[1]))
      : entry)));
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

function listMatchingCommands (command, matchAll = false) {
  const minimatcher = _underToSlash(_valmaGlobFromCommand(command || "*"));
  const ret = [].concat(...activePools.map(pool => pool.listing
      .map(file => _underToSlash(file.name))
      .filter(name => {
        const ret_ = minimatch(name, minimatcher, { dot: matchAll });
        return ret_;
      })
      .map(name => _valmaCommandFromPath(name))
  )).filter((v, i, a) => (a.indexOf(v) === i));
  if (vlm.verbosity >= 2) {
    console.log("vlm chatty:",
        matchAll ? "listMatchingCommands" : "listAllMatchingCommands", command,
        "\n\tminimatcher:", minimatcher,
        "\n\tresults:", ret);
  }
  return ret;
}

function listAllMatchingCommands (command) {
  return listMatchingCommands.call(this, command, true);
}

function executeExternal (executable, argv = [], spawnOptions = {}) {
  return new Promise((resolve, failure) => {
    _flushPendingConfigWrites(vlm);
    if (vlm.echo) console.log(colors.echo("    -->", executable, ...argv));
    if (vlm.contextYargv && vlm.contextYargv.dryRun) {
      console.log("vlm --dry-run: skipping execution and returning undefined");
      _onDone(0);
    } else {
      const subProcess = spawn(executable, argv, Object.assign(
          { env: process.env, stdio: ["inherit", "inherit", "inherit"] }, spawnOptions
      ));
      subProcess.on("exit", _onDone);
      subProcess.on("error", _onDone);
      process.on("SIGTERM", () => { subProcess.kill("SIGTERM"); });
      process.on("SIGINT", () => { subProcess.kill("SIGINT"); });
    }
    function _onDone (code, signal) {
      if (code || signal) {
        console.warn(colors.warning("    <--", executable, ": <error>:", code || signal));
        failure(code || signal);
      } else {
        _refreshActivePools();
        _reloadPackageAndValmaConfigs();
        if (vlm.echo) {
          console.log(colors.echo("    <--", executable, ": return values not implemented yet"));
        }
        resolve();
      }
    }
  });
}

function _determineIntrospection (module, yargv, command, isWildcard) {
  const entryIntro = yargv.version || yargv.showSummary || yargv.showInfo || yargv.showCode
      || yargv.showDescribe;
  if (command && !entryIntro) return !yargv.help ? undefined : { module, help: true };
  const identityCommand = !command && !yargv.dryRun && { vlm: {
    commandName: "vlm", module, modulePath: __filename,
    pool: { path: path.dirname(process.argv[1]) }
  } };
  const ret = {
    module,
    identityCommand,
    help: yargv.help,
    // entry intro section
    entryIntro: entryIntro || yargv.showName || yargv.showUsage,
    showHeaders: isWildcard && !identityCommand,
    showName: yargv.showName,
    showUsage: yargv.showUsage,
    showVersion: yargv.version,
    showSummary: yargv.showSummary || !entryIntro,
    showInfo: yargv.showInfo,
    showCode: yargv.showCode,
    showDescribe: yargv.showDescribe,
  };
  if (!ret.showName && !ret.showUsage) {
    if (!isWildcard && yargv.dryRun) ret.showUsage = true;
    else if (!entryIntro) ret.showName = true;
  }
  return ret;
}

function _outputIntrospection (introspect, commands_, commandGlob, listAll) {
  if (introspect.help) {
    yargs.vlm = vlm;
    yargs.showHelp("log");
    return [];
  }
  let commands = commands_;
  if (introspect.identityCommand) {
    if (introspect.entryIntro) {
      commands = introspect.identityCommand;
    } else {
      console.log(colors.bold("# Usage:", introspect.module.command));
      console.log();
      console.log(colors.bold(`# Commands${listAll ? " (incl. hidden/disabled)" : ""}:`));
    }
  }
  if (!globalYargv.pools) {
    return _outputInfos(commands);
  }
  for (const pool of [...activePools].reverse()) {
    if (!Object.keys(pool.commands).length) {
      console.log(colors.bold(
          `## Pool '${pool.name}' empty (matching "${pool.path}${commandGlob}")`));
    } else {
      console.log(colors.bold(
          `## Pool '${pool.name}' commands (matching "${pool.path}${commandGlob}"):`));
      _outputInfos(pool.commands, pool.path);
      console.log();
    }
  }

  function _outputInfos (commands, poolPath) {
    let nameAlign = 0;
    let usageAlign = 0;
    let versionAlign = 0;
    const infos = Object.keys(commands)
    .sort()
    .map((name) => {
      const command = commands[name];
      if (!command || (command.disabled && !listAll)) return {};
      const info = _commandInfo(command.modulePath, poolPath || command.pool.path);
      const module = command.module
          || ((info[0] !== "<missing_command_script>") && require(info[3]));

      const nameLength = name.length + (command.disabled ? 2 : 0);
      if (nameLength > nameAlign) nameAlign = nameLength;
      const usage = module && module.command || `${name} <script missing>`;
      if (usage.length > usageAlign) usageAlign = usage.length;

      if (info[0].length > versionAlign) versionAlign = info[0].length;
      return { name, module, usage, info };
    });
    if (introspect.showHeaders) {
      const headers = [
        ...(introspect.showName ? [_rightpad("command", nameAlign), "|"] : []),
        ...(introspect.showUsage ? [_rightpad("command usage", usageAlign), "|"] : []),
        ...(introspect.showSummary ? [_rightpad("summary", 71), "|"] : []),
        ...(introspect.showVersion ? [_rightpad("version", versionAlign), "|"] : []),
        ...(introspect.showInfo ? ["package | command pool | script path", "|"] : []),
      ];
      console.log(...headers.slice(0, -1).map(h => h === "|" ? "|" : colors.bold(h)));
      console.log(...headers.slice(0, -1).map(h => h === "|" ? "|" : h.replace(/./g, "-")));
    }
    infos.map(({ name, module, usage, info }) => {
      if (!info) return undefined;
      let ret = {};
      const name_ = commands[name].disabled ? `(${name})` : name;
      const infoRow = [
        ...(introspect.showName
              ? ["|", [(ret.name = name) && name_, nameAlign, colors.command]] : []),
        ...(introspect.showUsage ? ["|", [ret.usage = usage, usageAlign, colors.command]] : []),
        ...(introspect.showSummary ? ["|", [(ret.summary = !module
              ? "<script file not found>"
              : module.summary
                  || module.describe.match(/^(.[^\n]*)/)[1].slice(0, 71).replace(/\|/g, ";")), 71]]
          : []),
        ...(introspect.showVersion ? ["|", [(ret.version = info[0]), versionAlign]] : []),
        ...(introspect.showInfo ? ["|", (ret.info = info.slice(1)).join(" | ")] : []),
      ];
      _outputCommandInfo(infoRow.slice(1));
      if (introspect.showDescribe && module && module.describe) {
        console.log();
        console.log(module.describe);
        console.log();
      }
      if (introspect.showCode) {
        if (shell.test("-f", info[3])) {
          const scriptSource = String(shell.head({ "-n": 1000000 }, info[3]));
          console.log(cardinal.highlight(scriptSource,
              { theme: cardinal.tomorrowNight, linenos: true }));
        } else {
          console.log(`Cannot read command '${name}' script source from:`, info[3]);
        }
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
  if (packageConfigStatus.updated) _flushPackageConfig();
  if (valmaConfigStatus.updated) _flushValmaConfig();
}

function _flushPackageConfig () {
  if (vlm.contextYargv && vlm.contextYargv.dryRun) {
    console.log("vlm --dry-run: repository configuration updated but not writing package.json");
    return;
  }
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

function _flushValmaConfig () {
  if (vlm.contextYargv && vlm.contextYargv.dryRun) {
    console.log("vlm --dry-run: valma configuration updated but not writing valma.json");
    return;
  }
  if (vlm.verbosity) {
    console.log("vlm inform: valma configuration updated, writing valma.json");
  }
  const valmaConfigString = JSON.stringify(vlm.valmaConfig, null, 2);
  shell.ShellString(valmaConfigString).to(valmaConfigStatus.path);
  valmaConfigStatus.updated = false;
}