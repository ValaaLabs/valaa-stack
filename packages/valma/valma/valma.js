#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("util");

const cardinal = require("cardinal");
const colors = require("colors/safe");
const inquirer = require("inquirer");
const minimatch = require("minimatch");
const semver = require("semver");
const shell = require("shelljs");
const yargs = require("yargs");
const yargsParser = require("yargs/lib/parser");

cardinal.tomorrowNight = require("cardinal/themes/tomorrow-night");

/* eslint-disable vars-on-top, no-loop-func, no-restricted-syntax, no-cond-assign,
                  import/no-dynamic-require
*/

const vargs = _createVargs(process.argv.slice(2), process.cwd());

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
colors.info = (...rest) => colors.green(...rest);
colors.warning = (...rest) => colors.bold(colors.yellow(...rest));
colors.error = (...rest) => colors.bold(colors.red(...rest));

// vlm - the Valma global API singleton - these are available to all command scripts via both
// vargs.vlm (in scripts exports.builder) as well as vargv.vlm (in scripts exports.handler).
const vlm = vargs.vlm = {
  // Calls valma sub-command with argv.
  invoke,

  // Executes an external command and returns a promise of the command stdandard output as string.
  execute,

  // Immutable contents of package.json (contains pending updates as well)
  packageConfig: undefined,

  // Immutable contents of valma.json (contains pending updates as well)
  valmaConfig: undefined,

  // Registers pending updates to the package.json config file (immediately updates
  // vlm.packageConfig) which are written to file only immediately before valma execution exits or
  // an external command is about to be executed.
  // TODO(iridian): Improve the flush semantics, maybe to flush-on-subcommand-success - now it's
  // just silly.
  updatePackageConfig,

  // Registers pending updates to the valma.json config file (immediately updates vlm.valmaConfig)
  // which are written to file only immediately before valma execution exits or
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


  // Syntactic sugar

  tailor: function tailor (...customizations) {
    return Object.assign(Object.create(this), ...customizations);
  },

  readFile: util.promisify(fs.readFile),

  inquireConfirm: async (message, default_ = true) => {
    return (await vlm.inquire({
      type: "confirm", name: "confirm", message, default: default_,
    })).confirm;
  },

  toolName: "vlm",

  ifVerbose: function ifVerbose (minimumVerbosity, callback) {
    if (this.verbosity < minimumVerbosity) {
      function ssh () { return this; };
      return {
        ifVerbose: ssh, log: ssh, echo: ssh, warn: ssh, error: ssh, exception: ssh, info: ssh,
        babble: ssh, expound: ssh,
      };
    };
    if (callback) callback.call(this);
    return this;
  },

  // Flat direct forward to console.log
  log: function log (...rest) {
    console.log(...rest);
    return this;
  },
  // For echoing the valma wildcard matchings, invokations and external executions back to the
  // console.
  echo: function echo (...rest) {
    console.info(this.colors.echo(...rest));
    return this;
  },
  // When something unexpected happens which doesn't necessarily prevent the command from finishing
  // but might nevertheless be the root cause of errors later.
  // An example is a missing node_modules due to a lacking 'yarn install': this doesn't prevent
  // 'vlm --help' but would very likely be the cause for a 'cannot find command' error.
  warn: function warn (msg, ...rest) {
    console.warn(this.colors.warning(`${this.toolName} warns:`, msg), ...rest);
    return this;
  },
  // When something is definitely wrong and operation cannot do everything that was expected
  // but might still complete.
  error: function error (msg, ...rest) {
    console.error(this.colors.error(`${this.toolName} laments:`, msg), ...rest);
    return this;
  },
  // When something is catastrophically wrong and operation terminates immediately.
  exception: function exception (error, ...rest) {
    console.error(this.colors.error(`${this.toolName} panics:`, String(error)), ...rest);
    return this;
  },
  // Info messages are mildly informative, non-noisy, unexceptional yet quite important. They
  // provide a steady stream of relevant information about reality an attuned devop expects to see.
  // In so doing they enable the devop to notice a divergence between reality and their own
  // expectations as soon as possible and take corrective action. In particular, they are used to:
  // 1. confirm choices that were made or tell about choices that will need to be made
  // 2. inform about execution pathways taken (like --dry-run or prod-vs-dev environment)
  // 3. communicate about the progress of the operation phases,
  // etc.
  info: function info (msg, ...rest) {
    console.info(this.colors.info(`${this.toolName} informs:`, msg), ...rest);
    return this;
  },
  // Babble and expound are for learning and debugging. They are messages an attuned devop doesn't
  // want to see as they are noisy and don't fit any of the info criterias above.
  // They should always be gated behind --verbose.
  // Babble is for messages which take only couple lines.
  babble: function chat (msg, ...rest) {
    console.info(this.colors.info(`${this.toolName} babbles:`, msg), ...rest);
    return this;
  },

  // Expound messages can be arbitrarily immense.
  expound: function expound (msg, ...rest) {
    console.info(this.colors.info(`${this.toolName} expounds:`, msg), ...rest);
    return this;
  },
};

module.exports = {
  command: "vlm [-<flags>] [--<option>=<value> ...] <command> [parameters]",
  summary: "Dispatch a valma command to its command script",
  describe: `Valma (or 'vlm') is a command script dispatcher.

Any npm package can export new valma commands by exporting .js command
scripts via its package.json .bin stanza. When such a package is added
as a devDependency for a repository valma will then be able to locate
and invoke those commands from anywhere inside the repository.

Valma commands are hierarchical and can contain '/' in their names.
Valma invokations can use glob matching to make full use of these
hierarchical path parts (notably using the distinction between '*' and
'**').

A command for which any path part begins with '.' is hidden, all other
commands are listed. Listed scripts can be seen with 'vlm',
'vlm --help' or 'vlm -d' and they are typically intended to be called
by the user via the command line. Hidden scripts don't appear in
listings and are intended to be called by other valma scripts. They can
nevertheless be called directly and can be listed with option -a.

The export name in the npm package.json .bin stanza must be the command
name prefixed with 'valma-' (or '.valma-' if a hidden command begins
with a '.'). Additionally export name must have all '/' replaced with
'_' due to npm limitations. Valma will always treat '_' and '/'
characters to be equal although '/' is recommended anywhere possible.
`,

  builder: (vargs_) => vargs_
  //    .usage(module.exports.command, module.exports.summary, iy => iy)
      .options({
        v: {
          group: "Introspection options:",
          alias: "verbose", count: true, global: false,
          description: "Be noisy. -vv... -> be more noisy.",
        },
        p: {
          group: "Introspection options:",
          alias: "pools", type: "boolean", global: false,
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
          alias: "match-all", type: "boolean", global: false,
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
          description: "Promote to 'vlm' in the most specific pool available via forward",
        },
        "npm-config": {
          group: "Options:",
          type: "boolean", default: true, global: false,
          description: "Add node environment if it is missing via forward",
        },
        forward: {
          group: "Options:",
          type: "boolean", default: true, global: false,
          description: "Allow vlm forwarding due to promote, node-env or need to load vlm path",
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

function _addSharedOptions (vargs_, strict = true) {
  return vargs_
      .strict(strict)
      .help(false)
      .version(false)
      .wrap(vargs_.terminalWidth() < 140 ? vargs_.terminalWidth() : 140)
      .option({
        h: {
          group: "Introspection options:",
          alias: "help", type: "boolean", global: true,
          description: "Show the main help of the command",
        },
        d: {
          group: "Options:",
          alias: "dry-run", type: "boolean", global: true,
          description: "Do not execute but display all the matching command(s)",
        },
        N: {
          group: "Introspection options:",
          alias: "show-name", type: "boolean", global: true,
          description: "Show the command name of the matching command(s)",
        },
        U: {
          group: "Introspection options:",
          alias: "show-usage", type: "boolean", global: true,
          description: "Show the full usage of the matching command(s)",
        },
        V: {
          group: "Introspection options:",
          alias: "version", type: "boolean", global: true,
          description: "Show the version of the matching command(s)",
        },
        S: {
          group: "Introspection options:",
          alias: "show-summary", type: "boolean", global: true,
          description: "Show the summary of the command(s)",
        },
        I: {
          group: "Introspection options:",
          alias: "show-info", type: "boolean", global: true,
          description: "Show the info block of the command(s)",
        },
        D: {
          group: "Introspection options:",
          alias: "show-describe", type: "boolean", global: true,
          description: "Show the description of the command(s)",
        },
        C: {
          group: "Introspection options:",
          alias: "show-code", type: "boolean", global: true,
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

_addSharedOptions(vargs, !vlm.isCompleting);
const globalVargs = module.exports.builder(vargs);
const globalVargv = _parseUntilCommand(globalVargs, processArgv, "command");

vlm.verbosity = vlm.isCompleting ? 0 : globalVargv.verbose;
vlm.interactive = vlm.isCompleting ? 0 : globalVargv.interactive;
if (!globalVargv.echo || vlm.isCompleting) vlm.echo = function () {};

vlm.ifVerbose(1).babble("phase 1, init:", "determine global options and available pools.",
    `\n\tcommand: ${vlm.colors.command(globalVargv.command)
        }, verbosity: ${vlm.verbosity}, interactive: ${vlm.interactive}, echo: ${globalVargv.echo}`,
    "\n\tprocess.argv:", ...process.argv
).ifVerbose(2).babble("paths:", "cwd:", process.cwd(),
    "\n\tprocess.env.VLM_GLOBAL_POOL:", process.env.VLM_GLOBAL_POOL,
    "\n\tprocess.env.VLM_PATH:", process.env.VLM_PATH,
    "\n\tprocess.env.PATH:", process.env.PATH,
    "\n\tdefaultPaths:", JSON.stringify(defaultPaths)
).ifVerbose(3).expound("global options:", globalVargv);

const availablePools = [];
// When a command begins with ./ or contains valma- it is considered a direct file valma command.
// It's parent directory is made the initial "file" pool, replacing the "local" pool of regular
// valma commands. The depended pools are searched from this path.
if ((globalVargv.command || "").includes("valma-")
    || (globalVargv.command || "").slice(0, 2) === "./") {
  if (globalVargv.isCompleting) process.exit(0); // Let bash filename completion do its thing.
  const match = globalVargv.command.match(/(.*\/)?(\.?)valma-(.*?)(.js)?$/);
  globalVargv.command = match ? `${match[2]}${match[3]}` : "";
  const filePoolPath = path.posix.resolve((match && match[1]) || "");
  availablePools.push({ name: "file", path: filePoolPath });
} else {
  availablePools.push({ name: "local", path: globalVargv.localPool });
}
availablePools.push(..._locateDependedPools(
    availablePools[0].path, globalVargv.dependedPoolSubdirectory));
availablePools.push({ name: "global", path: globalVargv.globalPool });

vlm.ifVerbose(2)
    .expound("available pools:", availablePools);

let activePools = [];

const packageConfigStatus = {
  path: path.posix.join(process.cwd(), "package.json"), updated: false,
};
const valmaConfigStatus = {
  path: path.posix.join(process.cwd(), "valma.json"), updated: false,
};

vlm.contextVargv = globalVargv;
module.exports
    .handler(globalVargv)
    .then(result => (result !== undefined) && process.exit(result));

// Only function definitions from hereon.

async function handler (vargv) {
  // Phase21: Pre-load args with so-far empty pools to detect fully builtin commands (which don't
  // need forwarding).
  const fullyBuiltin = vlm.isCompleting || !vargv.command;

  const needNPM = !fullyBuiltin && vargv.npmConfig && !process.env.npm_package_name;
  const needVLMPath = !fullyBuiltin && !process.env.VLM_PATH;
  const needForward = !fullyBuiltin && needVLMPath;

  vlm.ifVerbose(1)
      .babble("phase 2, main:", "determine active commands, forwards, and do validations.",
          "\n\tfullyBuiltin:", fullyBuiltin, ", needNPM:", needNPM, ", needVLMPath:", needVLMPath,
              ", needForward:", needForward);

  // Phase 2: Load pools and forward to 'vlm' if needed (if a more specific 'vlm' is found or if the
  // node environment or 'vlm' needs to be loaded)
  const forwardPool = _refreshActivePools((pool, poolHasVLM, specificEnoughVLMSeen) => {
    vlm.ifVerbose(3)
        .babble(`evaluating pool ${pool.path}`, "has 'vlm':", poolHasVLM,
            "vlm seen:", specificEnoughVLMSeen);
    if (!globalVargv.forward || fullyBuiltin || !poolHasVLM
        || (specificEnoughVLMSeen && !needForward)
        || (!specificEnoughVLMSeen && !vargv.promote)) return undefined;
    return pool;
  });
  if (forwardPool && await _forwardToValmaInPool(forwardPool, needNPM)) {
    // Call was handled by a forward require to another valma.
    return undefined;
  }

  if (vlm.isCompleting) {
    vlm.contextVargv = globalVargv;
    vlm.invoke(vargv.command, vargv._);
    return 0;
  }

  process.on("SIGINT", () => {
    vlm.exception("interrupted by SIGINT:", "killing all child processes");
    setTimeout(() => process.exit(-1));
  });
  process.on("SIGTERM", () => {
    vlm.exception("terminated by SIGINT:", "killing all child processes");
    setTimeout(() => process.exit(-1));
  });

  // Do validations.

  vlm.ifVerbose(2)
      .expound("activePools:",
          ...[].concat(...activePools.map(pool => ["\n", Object.assign({}, pool, {
            listing: vlm.verbosity < 3
                ? "<hidden>"
                : Array.isArray(pool.listing) && pool.listing.map(entry => entry.name)
          })])),
          "\n");

  if (!fullyBuiltin && needVLMPath && !process.env.VLM_PATH) {
    vlm.error("could not find 'vlm' in PATH or in any pool");
    process.exit(-1);
  }

  if (!semver.satisfies(process.versions.node, nodeCheck)) {
    vlm.warn(`your node version is old (${process.versions.node}):`,
        "recommended to have at least", nodeCheck);
  }

  _reloadPackageAndValmaConfigs();

  if (vlm.packageConfig
      && (path.resolve("node_modules") !== path.resolve(availablePools[1].path, ".."))) {
    vlm.warn("node_modules missing:", "some dependent commands will likely be missing.",
        `\nRun '${colors.green("yarn install")}' to make dependent commands available.\n`);
  }

  if (!process.env.npm_config_user_agent) {
    if (needNPM && vlm.packageConfig) {
      vlm.warn("could not load NPM config environment variables");
    }
  } else {
    const npmVersion = (process.env.npm_config_user_agent || "").match(/npm\/([^ ]*) /);
    if (npmVersion && !semver.satisfies(npmVersion[1], npmCheck)) {
      vlm.warn(`your npm version is old (${npmVersion[1]})`,
          "recommended to have at least", npmCheck);
    }
  }

  try {
    const subVLM = Object.create(vlm);
    subVLM.contextVargv = vargv;
    const maybeRet = subVLM.invoke(vargv.command, vargv._);
    subVLM.invoke = callValmaWithEcho;
    await maybeRet;

    _flushPendingConfigWrites(vlm);
  } catch (error) {
    vlm.exception(error);
    throw error;
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
  vlm.echo("    ->> vlm", vlm.colors.command(command), vlm.colors.green(...argv));
  try {
    const ret = await invoke.call(this, command, argv);
    vlm.echo("    <<- vlm", `${vlm.colors.command(command)}:`,
        vlm.colors.blue((JSON.stringify(ret) || "undefined").slice(0, 40)));
    return ret;
  } catch (error) {
    vlm.echo("    <<- vlm", `${vlm.colors.command(command)}:`,
        vlm.colors.error("exception:", error));
    throw error;
  }
}

async function invoke (command, argv = []) {
  if (!Array.isArray(argv)) {
    throw new Error(`vlm.invoke: argv must be an array, got ${typeof argv}`);
  }
  if (!this || !this.ifVerbose) {
    throw new Error(`vlm.invoke: 'this' must be a valid vlm context`);
  }
  const contextVargv = this.contextVargv;
  const commandGlob = _underToSlash((contextVargv.matchAll || this.isCompleting)
      ? _valmaGlobFromCommandPrefix(command, contextVargv.matchAll)
      : _valmaGlobFromCommand(command || "*"));
  const isWildcardCommand = !command || (command.indexOf("*") !== -1);
  const activeCommands = {};
  const introspect = _determineIntrospection(module.exports, contextVargv, command,
      isWildcardCommand);

  // Phase 3: filter available command pools against the command glob

  this.ifVerbose(1)
      .babble("phase 3, invoke", this.colors.command(commandGlob), ...argv,
          "\n\tisWildcard:", isWildcardCommand, ", introspect options:", !!introspect);
  this.ifVerbose(2)
      .expound("introspect:", introspect)
      .expound("contextVargv:", { ...contextVargv, vlm: "<hidden>" });

  for (const pool of activePools) {
    pool.commands = {};
    pool.listing.forEach(file => {
      const slashedName = _underToSlash(file.name);
      const matches = minimatch(slashedName, commandGlob, { dot: contextVargv.matchAll });
      this.ifVerbose(3)
          .babble(`evaluating file ${file.name}`, "matches:", matches,
              "vs glob:", commandGlob, ", dir:", _isDirectory(file), ", slashedName:", slashedName);
      if (!matches || _isDirectory(file)) return;
      const commandName = _valmaCommandFromPath(file.name);
      pool.commands[commandName] = {
        commandName, pool, file,
        modulePath: path.posix.join(pool.path, file.name),
      };
      if (activeCommands[commandName]) return;
      const activeCommand = pool.commands[commandName];
      if (!this.isCompleting && shell.test("-e", activeCommand.modulePath)) {
        const module = activeCommand.module = require(activeCommand.modulePath);
        this.ifVerbose(3)
            .babble("    module found at path", activeCommand.modulePath);
        if (module && (module.command !== undefined) && (module.describe !== undefined)
            && (module.handler !== undefined)) {
          activeCommand.disabled = !module.builder
              || (module.disabled
                  && ((typeof module.disabled !== "function") || module.disabled(vargs)));
          if (!activeCommand.disabled || contextVargv.matchAll) {
            vargs.command(module.command, module.summary || module.describe,
              ...(!activeCommand.disable && module.builder ? [module.builder] : []), () => {});
          }
        } else if (!introspect && !contextVargv.dryRun) {
          throw new Error(`invalid script module '${activeCommand.modulePath
              }', export 'command', 'describe' or 'handler' missing`);
        }
      }
      activeCommands[commandName] = activeCommand;
    });
  }

  if (this.isCompleting || contextVargv.bashCompletion) {
    vargs.completion("bash-completion", (current, argvSoFar) => {
      const rule = _underToSlash(_valmaGlobFromCommandPrefix(argvSoFar._[1], argvSoFar.matchAll));
      const ret = [].concat(...activePools.map(pool => pool.listing
          .filter(node => !_isDirectory(node) && minimatch(_underToSlash(node.name || ""), rule,
              { dot: argvSoFar.matchAll }))
          .map(node => _valmaCommandFromPath(node.name))));
      return ret;
    });
    _parse(vargs, contextVargv.bashCompletion ? ["bash-completion"] : process.argv.slice(2));
    return 0;
  }

  const commandArgs = argv.map(arg => JSON.stringify(arg)).join(" ");

  this.ifVerbose(2)
      .expound("activeCommands: {", ...Object.keys(activeCommands).map(
                key => `\n\t\t${key}: ${activeCommands[key].modulePath}`),
          "\n\t}");

  if (introspect) {
    const ret = _outputIntrospection(introspect, activeCommands, commandGlob,
        contextVargv.matchAll || !isWildcardCommand);
    return isWildcardCommand ? ret : ret[0];
  }

  if (!isWildcardCommand && !Object.keys(activeCommands).length) {
    vlm.error(`cannot find command '${command}' from active pools:`,
        ...activePools.map(activePool => `\n\t"${path.posix.join(activePool.path, commandGlob)}"`));
    return -1;
  }

  // Phase 4: Dispatch the command(s)

  const dryRunCommands = contextVargv.dryRun && {};
  let ret = [];

  this.ifVerbose(1)
      .babble("phase 4, dispatch:", ...(dryRunCommands ? ["--dry-run"] : []),
          this.colors.command(commandGlob), ...argv,
          "\n\tactive commands:", ...Object.keys(activeCommands).map(c => vlm.colors.command(c)));

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
          vlm.error(`missing symlink target for`, vlm.colors.command(matchingCommand),
              "ignoring command script at", activeCommand.modulePath);
        }
        continue;
      }
      const subVLM = Object.create(this);
      const subVargs = Object.create(vargs);
      subVargs.vlm = subVLM;
      vargs.help().command(module.command, module.describe);
      const subCommand = `${matchingCommand} ${commandArgs}`;
      const disabled = (module.disabled
          && ((typeof module.disabled !== "function")
              ? `exports.disabled == ${String(module.disabled)}`
              : `exports.disabled => ${String(module.disabled(subVargs))}`))
          || (!module.builder(subVargs) && "exports.builder => falsy");
      if (dryRunCommands) {
        dryRunCommands[matchingCommand] = { ...activeCommand, disabled };
        continue;
      }
      const subVargv = _parse(subVargs, subCommand, { vlm: subVLM });
      const subIntrospect = _determineIntrospection(module, subVargv, subCommand);
      this.ifVerbose(3)
          .babble("parsed:", this.colors.command(matchingCommand), ...argv,
              disabled ? `: disabled, ${disabled}` : ""
      ).ifVerbose(4)
          .expound("\tsubArgv:", subVargv)
          .expound("\tsubIntrospect:", subIntrospect)

      if (subIntrospect) {
        ret = ret.concat(_outputIntrospection(
            subIntrospect, { [matchingCommand]: activeCommand }, command,
            subVargv.matchAll || !isWildcardCommand));
      } else if (isWildcardCommand && disabled) {
        this.ifVerbose(1)
            .info(`skipping disabled command '${this.colors.command(matchingCommand)}'`,
                `during wildcard invokation (${disabled})`);
        continue;
      } else {
        if (disabled) {
          this.warn(`invoking a disabled command '${matchingCommand}' explicitly`, `(${disabled})`);
        }
        subVargv.vlm.contextVargv = subVargv;
        await _tryInteractive(subVargv, subVargs.getOptions().interactive);
        if (isWildcardCommand) {
          this.echo("    >>> vlm", this.colors.command(subCommand), this.colors.green(commandArgs));
        }
        ret.push(await module.handler(subVargv));
        if (this.echo && (matchingCommand !== command)) {
          let retValue = JSON.stringify(ret[ret.length - 1]);
          if (retValue === undefined) retValue = "undefined";
          if (isWildcardCommand) {
            this.echo("    <<< vlm", `${this.colors.command(subCommand)}:`,
                this.colors.blue(retValue.slice(0, 20), retValue.length > 20 ? "..." : ""));
          }
        }
      }
    }
  }
  if (dryRunCommands) {
    _outputIntrospection(_determineIntrospection(module, contextVargv),
        dryRunCommands, command, contextVargv.matchAll || !isWildcardCommand);
  }
  return isWildcardCommand ? ret : ret[0];
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

function _parse (vargs_, ...rest) {
  const ret = vargs_.parse(...rest);
  return ret;
}

function _parseUntilCommand (vargs_, argv_, commandKey = "command") {
  const commandIndex = argv_.findIndex(arg => (arg[0] !== "-"));
  const ret = _parse(vargs_, argv_.slice(0, (commandIndex + 1) || undefined));
  if ((commandIndex !== -1) && (ret[commandKey] === undefined)) {
    if (ret._[0]) ret[commandKey] = ret._[0];
    else {
      throw new Error(`vlm error: malformed arguments: '${commandKey
          }' missing but command-like argument '${argv_[commandIndex]
          }' found (maybe provide flag values with '=' syntax?)`);
    }
  }
  ret.vlm = vargs_.vlm;
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

/**
 * Assigns all necessary missing environment variables to process.env
 *
 * Specifically these variables are not added to the actual surrounding shell environment: this
 * means that all valma commands must execute external scripts via vlm.execute call as it sets
 * these environment variables for the called script (execute also handles dry-running,
 * logging etc).
 *
 * @param {*} pool
 * @param {*} needNPMConfig
 */
async function _forwardToValmaInPool (vlmPool, needNPMConfig) {
  Object.assign(process.env, {
    VLM_PATH: process.env.VLM_PATH || vlmPool.path,
    VLM_GLOBAL_POOL: process.env.VLM_GLOBAL_POOL || globalVargv.globalPool,
    INIT_CWD: process.cwd(),
    PATH: `${[
      vlmPool.path,
      activePools[activePools.length - 1].path,
      activePools[0].path,
    ].join(":")}:${process.env.PATH}`,
    _: path.posix.join(vlmPool.path, "vlm"),
  });
  if (needNPMConfig) {
    await _loadNPMConfigVariables();
  }
  const myRealVLM = fs.realpathSync(process.argv[1]);
  const forwardRealVLM = fs.realpathSync(path.join(vlmPool.path, "vlm"));
  if (myRealVLM !== forwardRealVLM) {
    vlm.ifVerbose(1)
        .info(`forwarding to vlm at require("${forwardRealVLM}")`,
            "\n\tvia pool", vlmPool.path, `(current vlm "${myRealVLM})"`);
    process.argv[1] = forwardRealVLM;
    require(forwardRealVLM);
    return true;
  }
  // childProcess = childProcess.execFileSync(vlmPath, processArgv,
  //  { env: process.env, stdio: ["inherit", "inherit", "inherit"], detached: true });
  return false;
}

/**
 * Load all npm config variables to process.env as if running valma via 'npx -c'
 * FIXME(iridian): horribly broken.
 */
async function _loadNPMConfigVariables () {
  /*
  Broken: current implementation is a silly attempt - only npm config list -l --json options are
  loaded, omitting all npm_lifetime, npm_package_ config etc. options.
  A better overall solution to handling operations which need npm config might be to have valma
  commands explicitly specify that they need those commands but otherwise not load npm at all.
  A reliable method of achieving this is to call such commands with 'npx -c' (but it's still fing
  slow as it spawns node, npm and whatnot.
  Upside of current solution is that running "npm config list" is very fast, and can be optimized
  further too: npm can be programmatically invoked.
  */
  vlm.warn("did not load npm_package_* variables (not implemented yet)");
  Object.assign(process.env, {
    npm_execpath: "/usr/lib/node_modules/npm/bin/npm-cli.js",
    npm_lifecycle_event: "env",
    npm_lifecycle_script: "env",
    npm_node_execpath: "/usr/bin/node",
  });
  const execFile = util.promisify(childProcess.execFile);
  const { stdout, stderr } = await execFile("npm", ["config", "list", "-l", "--json"]);
  if (stderr) {
    vlm.error("leaving: can't load npm config with 'npm config list -l --json'");
    process.exit(-1);
  }
  const npmConfig = JSON.parse(stdout);
  for (const npmVariable of Object.keys(npmConfig)) {
    const value = npmConfig[npmVariable];
    process.env[`npm_config_${npmVariable.replace(/-/g, "_")}`] =
        typeof value === "string" ? value : "";
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
  vlm.ifVerbose(3)
      .babble(matchAll ? "listMatchingCommands" : "listAllMatchingCommands",
          vlm.colors.command(command),
          "\n\tminimatcher:", minimatcher,
          "\n\tresults:", ret);
  return ret;
}

function listAllMatchingCommands (command) {
  return listMatchingCommands.call(this, command, true);
}

/**
 * Execute given executable as per child_process.spawn.
 * Extra spawnOptions:
 *   noDryRun: if true this call will be executed even if --dry-run is requested.
 *   dryRunReturn: during dry runs this call will return immediately with the value of this option.
 *
 * All argv must be strings, all non-strings and falsy values will be filtered out.
 *
 * @param {*} executable
 * @param {*} [argv=[]]
 * @param {*} [spawnOptions={}]
 * @returns
 */
function execute (executable, argv = [], spawnOptions = {}) {
  return new Promise((resolve, failure) => {
    _flushPendingConfigWrites(vlm);
    const filteredArgv = argv.filter(arg => arg && (typeof arg === "string"));
    vlm.echo("    -->", vlm.colors.green(executable, ...filteredArgv));
    if (vlm.contextVargv && vlm.contextVargv.dryRun && !spawnOptions.noDryRun) {
      vlm.echo("      dry-run: skipping execution and returning:",
          vlm.colors.blue(spawnOptions.dryRunReturn || 0));
      _onDone(spawnOptions.dryRunReturn || 0);
    } else {
      const subProcess = childProcess.spawn(
          executable,
          filteredArgv, {
            stdio: ["inherit", "inherit", "inherit"],
            ...spawnOptions,
            detached: true,
          },
      );
      subProcess.on("exit", _onDone);
      subProcess.on("error", _onDone);
      process.on("SIGINT", () => {
        vlm.warn("vlm killing:", vlm.colors.green(executable, ...filteredArgv));
        process.kill(-subProcess.pid, "SIGTERM");
        process.kill(-subProcess.pid, "SIGKILL");
      });
      process.on("SIGTERM", () => {
        vlm.warn("vlm killing:", vlm.colors.green(executable, ...filteredArgv));
        process.kill(-subProcess.pid, "SIGTERM");
        process.kill(-subProcess.pid, "SIGKILL");
      });
    }
    function _onDone (code, signal) {
      if (code || signal) {
        vlm.echo("    <--", `${vlm.colors.green(executable)}:`,
            vlm.colors.error("<error>:", code || signal));
        failure(code || signal);
      } else {
        _refreshActivePools();
        _reloadPackageAndValmaConfigs();
        vlm.echo("    <--", `${vlm.colors.green(executable)}:`,
            vlm.colors.warning("execute return values not implemented yet"));
        resolve();
      }
    }
  });
}

function _determineIntrospection (module, vargv, command, isWildcard) {
  const entryIntro = vargv.version || vargv.showSummary || vargv.showInfo || vargv.showCode
      || vargv.showDescribe;
  if (command && !entryIntro) return !vargv.help ? undefined : { module, help: true };
  const identityCommand = !command && !vargv.dryRun && { vlm: {
    commandName: "vlm", module, modulePath: __filename,
    pool: { path: path.dirname(process.argv[1]) }
  } };
  const ret = {
    module,
    identityCommand,
    help: vargv.help,
    // entry intro section
    entryIntro: entryIntro || vargv.showName || vargv.showUsage,
    showHeaders: isWildcard && !identityCommand,
    showName: vargv.showName,
    showUsage: vargv.showUsage,
    showVersion: vargv.version,
    showSummary: vargv.showSummary || !entryIntro,
    showInfo: vargv.showInfo,
    showCode: vargv.showCode,
    showDescribe: vargv.showDescribe,
  };
  if (!ret.showName && !ret.showUsage) {
    if (!isWildcard && vargv.dryRun) ret.showUsage = true;
    else if (!entryIntro) ret.showName = true;
  }
  return ret;
}

function _outputIntrospection (introspect, commands_, commandGlob, listAll) {
  if (introspect.help) {
    vargs.vlm = vlm;
    vargs.showHelp("log");
    return [];
  }
  let activeCommands = commands_;
  if (introspect.identityCommand) {
    if (introspect.entryIntro) {
      activeCommands = introspect.identityCommand;
    } else {
      console.log(colors.bold("# Usage:", introspect.module.command));
      console.log();
      console.log(colors.bold(`# Commands${listAll ? " (incl. hidden/disabled)" : ""}:`));
    }
  }
  if (!globalVargv.pools) {
    return _outputInfos(activeCommands);
  }
  let outerRet = [];
  for (const pool of [...activePools].reverse()) {
    if (!Object.keys(pool.commands).length) {
      console.log(colors.bold(
          `## Pool '${pool.name}' empty (matching "${pool.path}${commandGlob}")`));
    } else {
      console.log(colors.bold(
          `## Pool '${pool.name}' commands (matching "${pool.path}${commandGlob}"):`));
      outerRet = outerRet.concat(_outputInfos(pool.commands, pool.path));
      console.log();
    }
  }
  return outerRet;

  function _outputInfos (commands, explicitPoolPath) {
    let nameAlign = 0;
    let usageAlign = 0;
    let versionAlign = 0;
    const infos = Object.keys(commands)
    .sort()
    .map((name) => {
      const command = commands[name];
      if (!command || (command.disabled && !listAll)) return {};
      const info = _commandInfo(command.modulePath, explicitPoolPath || command.pool.path);
      const module = command.module
          || ((info[0] !== "<missing_command_script>") && require(info[3]));

      const nameLength = name.length + (command.disabled ? 2 : 0);
      if (nameLength > nameAlign) nameAlign = nameLength;
      const usage = (module && module.command) || `${name} <script missing>`;
      if (usage.length > usageAlign) usageAlign = usage.length;

      if (info[0].length > versionAlign) versionAlign = info[0].length;
      return { name, module, usage, info };
    });
    if (introspect.showHeaders) {
      const headers = [
        ...(introspect.showName ? [_rightpad("command name", nameAlign), "|"] : []),
        ...(introspect.showUsage ? [_rightpad("command usage", usageAlign), "|"] : []),
        ...(introspect.showSummary ? [_rightpad("summary", 71), "|"] : []),
        ...(introspect.showVersion ? [_rightpad("version", versionAlign), "|"] : []),
        ...(introspect.showInfo ? ["package | command pool | script path", "|"] : []),
      ];
      console.log(...headers.slice(0, -1).map(h => (h === "|" ? "|" : colors.bold(h))));
      console.log(...headers.slice(0, -1).map(h => (h === "|" ? "|" : h.replace(/./g, "-"))));
    }
    return infos.map(({ name, module, usage, info }) => {
      if (!info) return undefined;
      const ret = {};
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
      if (infoRow.length > 1) _outputCommandInfo(infoRow.slice(1));
      if (introspect.showDescribe && module && module.describe) {
        if (infoRow.length > 1) console.log();
        console.log(module.describe);
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

async function _tryInteractive (subVargv, interactiveOptions) {
  if (!vlm.interactive || !interactiveOptions) return subVargv;
  const questions = [];
  for (const optionName of Object.keys(interactiveOptions)) {
    const option = interactiveOptions[optionName];
    const question = Object.assign({}, option.interactive);
    if (question.when !== "always") {
      if ((question.when !== "if-undefined") || (typeof subVargv[optionName] !== "undefined")) {
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
  if (!Object.keys(questions).length) return subVargv;
  const answers = {};
  for (const question of questions) {
    do {
      Object.assign(answers, await vlm.inquire([question]));
    } while (question.confirm && !await question.confirm(answers[question.name], answers));
  }
  return Object.assign(subVargv, answers);
}


function _reloadPackageAndValmaConfigs () {
  if (shell.test("-f", packageConfigStatus.path)) {
    vlm.packageConfig = JSON.parse(shell.head({ "-n": 1000000 }, packageConfigStatus.path));
    _deepFreeze(vlm.packageConfig);
  }
  if (shell.test("-f", valmaConfigStatus.path)) {
    vlm.valmaConfig = JSON.parse(shell.head({ "-n": 1000000 }, valmaConfigStatus.path));
    _deepFreeze(vlm.valmaConfig);
  }
}

function updatePackageConfig (updates) {
  if (!vlm.packageConfig) {
    throw new Error("vlm.updatePackageConfig: cannot update package.json as it doesn't exist");
  }
  const updatedConfig = _deepAssign(vlm.packageConfig, updates);
  if (updatedConfig !== vlm.packageConfig) {
    packageConfigStatus.updated = true;
    vlm.packageConfig = updatedConfig;
    vlm.ifVerbosity(1)
        .info("package.json updated:", updates);
  }
}

function updateValmaConfig (updates) {
  if (!vlm.valmaConfig) {
    vlm.valmaConfig = {};
    valmaConfigStatus.updated = true;
  }
  const updatedConfig = _deepAssign(vlm.valmaConfig, updates);
  if (updatedConfig !== vlm.valmaConfig) {
    valmaConfigStatus.updated = true;
    vlm.valmaConfig = updatedConfig;
    vlm.ifVerbosity(1)
        .info("valma.json updated:", updates);
  }
}

function _deepFreeze (object) {
  if (typeof object !== "object" || !object) return;
  Object.freeze(object);
  Object.values(object).forEach(_deepFreeze);
}

function _deepAssign (target, source) {
  if (typeof source === "undefined") return target;
  if (Array.isArray(target)) return target.concat(source);
  if ((typeof source !== "object") || (source === null)
      || (typeof target !== "object") || (target === null)) return source;
  let objectTarget = target;
  Object.keys(source).forEach(sourceKey => {
    const newValue = _deepAssign(target[sourceKey], source[sourceKey]);
    if (newValue !== objectTarget[sourceKey]) {
      if (objectTarget === target) objectTarget = { ...target };
      objectTarget[sourceKey] = newValue;
    }
  });
  return objectTarget;
}

function _flushPendingConfigWrites () {
  _commitUpdates("valma.json", valmaConfigStatus, () => vlm.valmaConfig);
  _commitUpdates("package.json", packageConfigStatus, () => {
    const reorderedConfig = {};
    reorderedConfig.name = vlm.packageConfig.name;
    reorderedConfig.version = vlm.packageConfig.version;
    if (vlm.packageConfig.valaa !== undefined) reorderedConfig.valaa = vlm.packageConfig.valaa;
    Object.keys(vlm.packageConfig).forEach(key => {
      if (reorderedConfig[key] === undefined) reorderedConfig[key] = vlm.packageConfig[key];
    });
  });
}

function _commitUpdates (filename, configStatus, createUpdatedConfig) {
  if (!configStatus.updated) return;
  if (vlm.contextVargv && vlm.contextVargv.dryRun) {
    vlm.info(`commit '${filename}' updates --dry-run:`, "not committing queued updates to file");
    return;
  }
  const configString = JSON.stringify(createUpdatedConfig(), null, 2);
  shell.ShellString(`${configString}\n`).to(configStatus.path);
  vlm.ifVerbose(1)
      .info(`committed '${filename}' updates to file:`);
  configStatus.updated = false;
}

function _createVargs (args, cwd) {
  // Get a proper, clean yargs instance for neat extending.
  const ret = yargs(args, cwd);

  // Extend option/options with:
  //   interactive
  //   causes
  const baseOptions = ret.options;
  ret.option = ret.options = function valmaOptions (opt, attributes) {
    if (typeof opt !== "object") {
      const optionState = this.getOptions();
      if (attributes.interactive) {
        if (!optionState.interactive) optionState.interactive = {};
        optionState.interactive[opt] = attributes;
      }
      if (attributes.causes) {
        if (!optionState.causes) optionState.causes = {};
        optionState.causes[opt] = attributes.causes;
      }
    }
    baseOptions.call(this, opt, attributes);
    return this;
  };

  // Extend parse with:
  //   causes
  const baseParse = ret.parse;
  ret.parse = function valmaParse (...rest) {
    const vargv = baseParse.apply(this, rest);
    const options = this.getOptions();
    let effects = [];
    for (const cause of Object.keys(options.causes || {})) {
      effects = effects.concat(_consequences(vargv[cause], options.causes[cause]));
    }
    function _consequences (reason, causes) {
      if (!reason) return [];
      if (typeof causes === "string") return [`--${causes}`];
      if (Array.isArray(causes)) {
        return [].concat(...causes.map(cause => _consequences(reason, cause)));
      }
      return [];
    }
    if (effects.length) {
      const { argv } = yargsParser(effects, { ...options, default: {} });
      for (const effect of Object.keys(argv)) {
        if ((effect !== "_") && argv[effect]) vargv[effect] = argv[effect];
      }
    }
    return vargv;
  }
  return ret;
}
