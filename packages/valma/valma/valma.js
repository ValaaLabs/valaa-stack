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
const yargsParser = require("yargs-parser").detailed;

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
  poolBase: path.posix.resolve("."),
  poolDirectories: ["node_modules/.bin/", "valma.bin/"],
  globalPool: process.env.VLM_GLOBAL_POOL || (shell.which("vlm") || "").slice(0, -3),
};

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

  getPackageConfig,
  getValmaConfig,

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

  // TODO(iridian): These should eventually be in a separate library. Fundamentally valma shouldn't
  // know about toolsets. OTOH valma type and the toolset scripts are part of valma package, so...
  getToolsetConfig,
  getToolConfig,
  confirmToolsetExists,
  updateToolsetConfig,
  updateToolConfig,
  createStandardToolsetOption,

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

  tailor (...customizations) {
    return Object.assign(Object.create(this), ...customizations);
  },

  readFile: util.promisify(fs.readFile),

  inquireText: async (message, default_ = "") =>
      (await vlm.inquire({
        type: "input", name: "text", message, default: default_,
      })).text,
  inquireConfirm: async (message, default_ = true) =>
      (await vlm.inquire({
        type: "confirm", name: "confirm", message, default: default_,
      })).confirm,

  commandName: "vlm",

  ifVerbose (minimumVerbosity, callback) {
    function ssh () { return this; }
    if (this.verbosity < minimumVerbosity) {
      return {
        ifVerbose: ssh, log: ssh, echo: ssh, warn: ssh, error: ssh, exception: ssh, info: ssh,
        babble: ssh, expound: ssh,
      };
    }
    if (callback) callback.call(this);
    return this;
  },

  // Alias for console.log for unprocessed payload output directly to stdout
  log (...rest) {
    console.log(...rest);
    return this;
  },
  // Alias for console.warn for unprocessed diagnostics output directly to stderr
  speak (...rest) {
    console.warn(...rest);
    return this;
  },
  // Echo the valma wildcard matchings, invokations and external executions back to the user.
  // As a diagnostic message outputs to stderr where available.
  echo (...rest) {
    if (this.colors.echo) {
      console.warn(this.colors.echo(...rest));
    }
    return this;
  },

  // Diagnostics ops
  // These operations prefix the output with the command name and a verb describing the type of
  // the communication. They output to stderr where available.

  // When something unexpected happens which doesn't necessarily prevent the command from finishing
  // but might nevertheless be the root cause of errors later.
  // An example is a missing node_modules due to a lacking 'yarn install': this doesn't prevent
  // 'vlm --help' but would very likely be the cause for a 'cannot find command' error.
  // As a diagnostic message outputs to stderr where available.
  warn (msg, ...rest) {
    if (this.colors.warning) {
      console.warn(this.colors.warning(`${this.commandName} warns:`, msg), ...rest);
    }
    return this;
  },
  // When something is definitely wrong and operation cannot do everything that was expected
  // but might still complete.
  // As a diagnostic message outputs to stderr where available.
  error (msg, ...rest) {
    if (this.colors.error) {
      console.error(this.colors.error(`${this.commandName} laments:`, msg), ...rest);
    }
    return this;
  },
  // When something is catastrophically wrong and operation terminates immediately.
  // As a diagnostic message outputs to stderr where available.
  exception (error, ...rest) {
    if (this.colors.exception) {
      console.error(this.colors.exception(`${this.commandName} panics:`, String(error)), ...rest);
    }
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
  // As a diagnostic message outputs to stderr where available.
  // Note! This is a divergence from Node console.info which outputs to stdout. However, diagnostics
  // messages need to go to stderr so that they can be separated from payload output and work
  // correctly with piping in general.
  info (msg, ...rest) {
    if (this.colors.info) {
      console.warn(this.colors.info(`${this.commandName} informs:`, msg), ...rest);
    }
    return this;
  },
  instruct (msg, ...rest) {
    if (this.colors.instruct) {
      console.warn(this.colors.instruct(`${this.commandName} instructs:`, msg), ...rest);
    }
    return this;
  },
  // Babble and expound are for learning and debugging. They are messages an attuned devop doesn't
  // want to see as they are noisy and don't fit any of the info criterias above.
  // They should always be gated behind --verbose.
  // Babble is for messages which take only couple lines.
  // As a diagnostic message outputs to stderr where available.
  babble (msg, ...rest) {
    if (this.colors.babble) {
      console.warn(this.colors.babble(`${this.commandName} babbles:`, msg), ...rest);
    }
    return this;
  },

  // Expound messages can be arbitrarily immense.
  // As a diagnostic message outputs to stderr where available.
  expound (msg, ...rest) {
    if (this.colors.expound) {
      console.warn(this.colors.expound(`${this.commandName} expounds:`, msg), ...rest);
    }
    return this;
  },
};

colors._setTheme = function _setTheme (obj) {
  Object.keys(obj).forEach(name => {
    this[name] = (Array.isArray(obj[name]) ? obj[name] : [obj[name]])
        .map(name_ => this[name_].bind(this))
        .reduceRight((next, subOp) => (...rest) => subOp(next(...rest)));
  });
};

colors._setTheme({
  echo: "dim",
  warning: ["bold", "yellow"],
  error: ["bold", "red"],
  exception: ["bold", "red"],
  info: "cyan",
  instruct: ["bold", "cyan"],
  babble: "cyan",
  expound: "cyan",
  command: ["bold", "magenta"],
  overridden: ["strikethrough", "bold", "magenta"],
  arguments: ["magenta"],
  executable: ["magenta"],
});

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
          alias: "pools", type: "boolean", global: true,
          description: "Show overridden and disabled pool commands.",
        },
        echo: {
          group: "Introspection options:",
          type: "boolean", default: true, global: true,
          description: "Echo all external and sub-command calls with their return values",
        },
        warnings: {
          group: "Introspection options:",
          type: "boolean", default: true, global: true,
          description: "Show warning messages",
        },
        babbles: {
          group: "Introspection options:",
          type: "boolean", default: true, global: true,
          description: "Show babble messages",
        },
        expounds: {
          group: "Introspection options:",
          type: "boolean", default: true, global: true,
          description: "Show expound messages",
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
        "pool-base": {
          group: "Options:",
          type: "string", default: defaultPaths.poolBase, global: false,
          description: "Initial pool base path for gathering pools through all parent paths.",
        },
        "pool-directories": {
          group: "Options:", array: true,
          type: "string", default: defaultPaths.poolDirectories, global: false,
          description: "Pool directories are appended to current pool base to locate pools",
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
if (!globalVargv.echo || vlm.isCompleting) vlm.echo = function noEcho () { return this; };
if (!globalVargv.warnings || vlm.isCompleting) vlm.warn = function noWarnings () { return this; };
if (!globalVargv.babbles || vlm.isCompleting) vlm.babble = function noBabble () { return this; };
if (!globalVargv.expounds || vlm.isCompleting) vlm.expound = function noExpound () { return this; };

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

const _availablePools = [];
// When a command begins with ./ or contains valma- it is considered a direct file valma command.
// It's parent directory is made the initial "file" pool.
let poolBase = globalVargv.poolBase;
if ((globalVargv.command || "").includes("valma-")
    || (globalVargv.command || "").slice(0, 2) === "./") {
  if (globalVargv.isCompleting) process.exit(0); // Let bash filename completion do its thing.
  const match = globalVargv.command.match(/(.*\/)?(\.?)valma-(.*?)(.js)?$/);
  globalVargv.command = match ? `${match[2]}${match[3]}` : "";
  const filePoolPath = vlm.path.resolve((match && match[1]) || "");
  _availablePools.push({ name: "file", path: filePoolPath });
  poolBase = filePoolPath;
}
_availablePools.push(..._locateDependedPools(poolBase, globalVargv.poolDirectories));
_availablePools.push({ name: "global", path: globalVargv.globalPool });

vlm.ifVerbose(2)
    .expound("available pools:", _availablePools);

let _activePools = [];

const packageConfigStatus = {
  path: vlm.path.join(process.cwd(), "package.json"), updated: false,
};
const valmaConfigStatus = {
  path: vlm.path.join(process.cwd(), "valma.json"), updated: false,
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
    Object.assign(process.env, {
      VLM_PATH: process.env.VLM_PATH || pool.path,
      VLM_GLOBAL_POOL: process.env.VLM_GLOBAL_POOL || globalVargv.globalPool,
      INIT_CWD: process.cwd(),
      PATH: `${[
        pool.path,
        _activePools[_activePools.length - 1].path,
        _activePools[0].path,
      ].join(":")}:${process.env.PATH}`,
      _: vlm.path.join(pool.path, "vlm"),
    });
    const myRealVLM = fs.realpathSync(process.argv[1]);
    pool.vlmPath = path.join(pool.path, "vlm");
    const forwardRealVLM = fs.realpathSync(pool.vlmPath);
    if (myRealVLM === forwardRealVLM) return undefined;
    vlm.ifVerbose(1)
        .info(`forwarding to vlm at require("${pool.vlmPath}")`, "via pool", pool.path,
            "\n\treal path:", forwardRealVLM, `(current vlm "${myRealVLM})"`);
    return pool;
  });
  if (forwardPool) {
    // Call is handled by a forward require to another valma.
    process.argv[1] = forwardPool.vlmPath;
    require(forwardPool.vlmPath);
    return undefined;
  }
  if (needNPM) {
    await _loadNPMConfigVariables();
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
          ...[].concat(..._activePools.map(pool => ["\n", Object.assign({}, pool, {
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
  vlm.echo("    ->> vlm", vlm.colors.command(command), vlm.colors.arguments(...argv));
  try {
    const ret = await invoke.call(this, command, argv);
    vlm.echo("    <<- vlm", `${vlm.colors.command(command)}:`,
        vlm.colors.blue((JSON.stringify(ret) || "undefined").slice(0, 71)));
    return ret;
  } catch (error) {
    vlm.echo("    <<- vlm", `${vlm.colors.command(command)}:`,
        vlm.colors.exception("exception:", error));
    throw error;
  }
}

async function invoke (command, argv_ = []) {
  if (!Array.isArray(argv_)) {
    throw new Error(`vlm.invoke: argv must be an array, got ${typeof argv_}`);
  }
  if (!this || !this.ifVerbose) {
    throw new Error(`vlm.invoke: 'this' must be a valid vlm context`);
  }
  const argv = [].concat(...argv_.map(entry =>
      (Array.isArray(entry)
          ? entry
      : (!entry || typeof entry !== "object")
          ? _toArgString(entry)
          : [].concat(...Object.keys(entry).map(key => _toArgString(entry[key], key))))));
  function _toArgString (value, key) {
    if ((value === undefined) || (value === null)) return [];
    if (typeof value === "string") return !key ? value : [`--${key}`, value];
    if ((typeof value === "boolean") && key) return value ? `--${key}` : `--no-${key}`;
    return JSON.stringify(value);
  }

  const contextVargv = this.contextVargv;
  const commandGlob = _underToSlash((contextVargv.matchAll || this.isCompleting)
      ? _valmaGlobFromCommandPrefix(command, contextVargv.matchAll)
      : _valmaGlobFromCommand(command || "*"));
  const isWildcardCommand = !command || (command.indexOf("*") !== -1);
  const introspect = _determineIntrospection(module.exports, contextVargv, command,
      isWildcardCommand);

  // Phase 3: filter available command pools against the command glob

  this.ifVerbose(1)
      .babble("phase 3, invoke", this.colors.command(commandGlob), this.colors.arguments(...argv),
          "\n\tisWildcard:", isWildcardCommand, ", introspect options:", !!introspect);
  this.ifVerbose(2)
      .expound("introspect:", introspect)
      .expound("contextVargv:", { ...contextVargv, vlm: "<hidden>" });

  const activeCommands = _selectActiveCommands(this, _activePools, commandGlob, introspect);

  if (this.isCompleting || contextVargv.bashCompletion) {
    vargs.completion("bash-completion", (current, argvSoFar) => {
      const rule = _underToSlash(_valmaGlobFromCommandPrefix(argvSoFar._[1], argvSoFar.matchAll));
      const ret = [].concat(..._activePools.map(pool => pool.listing
          .filter(node => !_isDirectory(node) && minimatch(_underToSlash(node.name || ""), rule,
              { dot: argvSoFar.matchAll }))
          .map(node => _valmaCommandFromPath(node.name))));
      return ret;
    });
    _parse(vargs, contextVargv.bashCompletion ? ["bash-completion"] : process.argv.slice(2));
    return 0;
  }

  this.ifVerbose(2)
      .expound("activeCommands: {", ...Object.keys(activeCommands).map(
                key => `\n\t\t${key}: ${activeCommands[key].modulePath}`),
          "\n\t}");

  if (introspect) {
    const ret = _outputIntrospection(introspect, activeCommands, commandGlob,
        isWildcardCommand, contextVargv.matchAll);
    return isWildcardCommand ? ret : ret[0];
  }

  if (!isWildcardCommand && !Object.keys(activeCommands).length) {
    vlm.error(`cannot find command '${command}' from active pools:`,
        ..._activePools.map(activePool => `\n\t"${vlm.path.join(activePool.path, commandGlob)}"`));
    return -1;
  }

  // Phase 4: Dispatch the command(s)

  const dryRunCommands = contextVargv.dryRun && {};
  let ret = [];

  this.ifVerbose(1)
      .babble("phase 4, dispatch:", ...(dryRunCommands ? ["--dry-run"] : []),
          this.colors.command(commandGlob), this.colors.arguments(argv),
          "\n\tactive commands:", ...Object.keys(activeCommands).map(c => vlm.colors.command(c)));
  vargs.help();

  // Reverse to have matching global command names execute first (while obeying overrides)
  for (const activePool of _activePools.slice().reverse()) {
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
      subVargs.vlm.commandName = matchingCommand;
      vargs.command(module.command, module.describe);
      const disabled = (module.disabled
          && ((typeof module.disabled !== "function")
                  ? `exports.disabled == ${String(module.disabled)}`
              : (module.disabled(subVargs)
                  && `exports.disabled => ${String(module.disabled(subVargs))}`)))
          || (!module.builder(subVargs) && "exports.builder => falsy");
      if (dryRunCommands) {
        dryRunCommands[matchingCommand] = { ...activeCommand, disabled };
        continue;
      }
      const subVargv = _parse(subVargs, [matchingCommand, ...argv], { vlm: subVLM });
      const subIntrospect = _determineIntrospection(module, subVargv, matchingCommand);
      this.ifVerbose(3)
          .babble("parsed:", this.colors.command(matchingCommand), this.colors.arguments(...argv),
              disabled ? `: disabled, ${disabled}` : ""
      ).ifVerbose(4)
          .expound("\tsubArgv:", subVargv)
          .expound("\tsubIntrospect:", subIntrospect);

      if (subIntrospect) {
        ret = ret.concat(_outputIntrospection(
            subIntrospect, { [matchingCommand]: activeCommand }, command,
            isWildcardCommand, subVargv.matchAll));
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
        if (isWildcardCommand) {
          this.echo("    >>> vlm", this.colors.command(matchingCommand),
              this.colors.arguments(...argv));
        }
        await _tryInteractive(subVargv, subVargs);
        ret.push(await module.handler(subVargv));
        if (this.echo && (matchingCommand !== command)) {
          let retValue = JSON.stringify(ret[ret.length - 1]);
          if (retValue === undefined) retValue = "undefined";
          if (isWildcardCommand) {
            this.echo("    <<< vlm", `${this.colors.command(matchingCommand)}:`,
                this.colors.blue(retValue.slice(0, 20), retValue.length > 20 ? "..." : ""));
          }
        }
      }
    }
  }
  if (dryRunCommands) {
    _outputIntrospection(_determineIntrospection(module, contextVargv),
        dryRunCommands, command, isWildcardCommand, contextVargv.matchAll);
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

function _locateDependedPools (initialPoolBase, poolDirectories) {
  let pathBase = initialPoolBase;
  const ret = [];
  while (pathBase) {
    poolDirectories.forEach(candidate => {
      const poolPath = vlm.path.join(pathBase, candidate);
      if (shell.test("-d", poolPath)) {
        ret.push({ name: `${pathBase.match(/([^/]*)\/?$/)[1]}/${candidate}`, path: poolPath });
        return;
      }
      const packageJsonPath = vlm.path.join(pathBase, "package.json");
      if (candidate.match(/^node_modules/) && shell.test("-f", packageJsonPath)) {
        vlm.warn(`node_modules missing for ${packageJsonPath}:`,
            "some dependent commands will likely be missing.",
            `Run '${colors.executable("yarn install")}' to make dependent commands available.\n`);
      }
    });
    if (pathBase === "/") break;
    pathBase = vlm.path.join(pathBase, "..");
  }
  return ret;
}

function _refreshActivePools (tryShortCircuit) {
  _activePools = [];
  let specificEnoughVLMSeen = false;
  for (const pool of _availablePools) {
    if (!pool.path || !shell.test("-d", pool.path)) continue;
    let poolHasVLM = false;
    pool.listing = shell.ls("-lAR", pool.path)
        .filter(file => {
          if (file.name.slice(0, 5) === "valma" || file.name.slice(0, 6) === ".valma") return true;
          if (file.name === "vlm") poolHasVLM = true;
          return false;
        });
    _activePools.push(pool);
    if (process.argv[1].indexOf(pool.path) === 0) specificEnoughVLMSeen = true;
    const shortCircuit = tryShortCircuit
        && tryShortCircuit(pool, poolHasVLM, specificEnoughVLMSeen);
    if (shortCircuit) return shortCircuit;
  }
  return undefined;
}

function _selectActiveCommands (contextVLM, activePools, commandGlob, introspect) {
  const ret = {};
  for (const pool of activePools) {
    pool.commands = {};
    pool.stats = {};
    pool.listing.forEach(file => {
      const slashedName = _underToSlash(file.name);
      const matches = minimatch(slashedName, commandGlob,
          { dot: contextVLM.contextVargv.matchAll });
      contextVLM.ifVerbose(3)
          .babble(`evaluating file ${file.name}`, "matches:", matches, "vs glob:", commandGlob,
          ", dir:", _isDirectory(file), ", slashedName:", slashedName);
      if (!matches) {
        pool.stats.nonmatching = (pool.stats.nonmatching || 0) + 1;
        return;
      }
      if (_isDirectory(file)) return;
      const commandName = _valmaCommandFromPath(file.name);
      pool.commands[commandName] = {
        commandName, pool, file,
        modulePath: vlm.path.join(pool.path, file.name),
      };
      if (ret[commandName]) {
        pool.stats.overridden = (pool.stats.overridden || 0) + 1;
        return;
      }
      const activeCommand = pool.commands[commandName];
      if (!contextVLM.isCompleting && shell.test("-e", activeCommand.modulePath)) {
        const module = activeCommand.module = require(activeCommand.modulePath);
        contextVLM.ifVerbose(3)
            .babble("    module found at path", activeCommand.modulePath);
        if (module && (module.command !== undefined) && (module.describe !== undefined)
            && (module.handler !== undefined)) {
          activeCommand.disabled = !module.builder
              || (module.disabled
                  && ((typeof module.disabled !== "function") || module.disabled(vargs)));
          if (!activeCommand.disabled || contextVLM.contextVargv.matchAll) {
            vargs.command(module.command, module.summary || module.describe,
              ...(!activeCommand.disable && module.builder ? [module.builder] : []), () => {});
          } else {
            pool.stats.disabled = (pool.stats.disabled || 0) + 1;
          }
        } else if (!introspect && !contextVLM.contextVargv.dryRun) {
          throw new Error(`invalid script module '${activeCommand.modulePath
              }', export 'command', 'describe' or 'handler' missing`);
        }
      }
      ret[commandName] = activeCommand;
    });
  }
  return ret;
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
  const ret = [].concat(..._activePools.map(pool => pool.listing
      .map(file => _underToSlash(file.name))
      .filter(name => {
        const ret_ = minimatch(name, minimatcher, { dot: matchAll });
        return ret_;
      })
      .map(name => _valmaCommandFromPath(name))
  )).filter((v, i, a) => (a.indexOf(v) === i));
  vlm.ifVerbose(1)
      .expound(matchAll ? "listMatchingCommands:" : "listAllMatchingCommands:",
          vlm.colors.command(command),
          ...(vlm.verbosity > 1 ? [", minimatcher:", minimatcher] : []),
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
    vlm.echo("    -->", vlm.colors.executable(executable, ...filteredArgv));
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

function _outputIntrospection (introspect, commands_, commandGlob, isWildcard, matchAll) {
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
      vlm.log(colors.bold("# Usage:", introspect.module.command));
      vlm.log();
      vlm.log(colors.bold(`# Commands${matchAll ? " (incl. hidden/disabled)" : ""}:`));
    }
  }
  let outerRet = [];
  for (const pool of [..._activePools].reverse()) {
    const isEmpty = !Object.keys(pool.commands).length;
    if (isWildcard) {
      vlm.log(colors.bold(`## ${vlm.path.join(pool.name, commandGlob)} ${
        isEmpty ? "has no shown commands" : "commands:"}`),
        `(${vlm.colors.info(Object.keys(pool.stats || {})
            .map(s => `${s}: ${pool.stats[s]}`).join(", "))
        })`);
    }
    if (!isEmpty) outerRet = outerRet.concat(_outputInfos(pool, globalVargv.pools));
  }
  return outerRet;

  function _outputInfos (pool, showHidden) {
    let nameAlign = 0;
    let usageAlign = 0;
    let versionAlign = 0;
    const infos = Object.keys(pool.commands)
    .sort()
    .map((name) => {
      const command = pool.commands[name];
      if (!command || (!showHidden
          && ((command.disabled && isWildcard) || (activeCommands[name] !== command)))) {
        return {};
      }
      const info = _commandInfo(command.modulePath, pool.path);
      const module = command.module
          || ((info[0] !== "<missing_command_script>") && require(info[3]));

      const nameLength = name.length + (command.disabled ? 2 : 0);
      if (nameLength > nameAlign) nameAlign = nameLength;
      const usage = (module && module.command) || `${name} <script missing>`;
      if (usage.length > usageAlign) usageAlign = usage.length;

      if (info[0].length > versionAlign) versionAlign = info[0].length;
      return { command, name, module, usage, info };
    });
    if (introspect.showHeaders) {
      const headers = [
        ...(introspect.showName ? [_rightpad("command name", nameAlign), "|"] : []),
        ...(introspect.showUsage ? [_rightpad("command usage", usageAlign), "|"] : []),
        ...(introspect.showSummary ? [_rightpad("summary", 71), "|"] : []),
        ...(introspect.showVersion ? [_rightpad("version", versionAlign), "|"] : []),
        ...(introspect.showInfo ? ["package | command pool | script path", "|"] : []),
      ];
      vlm.log(...headers.slice(0, -1).map(h => (h === "|" ? "|" : colors.bold(h))));
      vlm.log(...headers.slice(0, -1).map(h => (h === "|" ? "|" : h.replace(/./g, "-"))));
    }
    return infos.map(({ command, name, module, usage, info }) => {
      if (!info) return undefined;
      const ret = {};
      const name_ = pool.commands[name].disabled ? `(${name})` : name;
      const commandStyle = (activeCommands[name].pool === command.pool)
          ? colors.command : colors.overridden;
      const infoRow = [
        ...(introspect.showName
              ? ["|", [(ret.name = name) && name_, nameAlign, commandStyle]] : []),
        ...(introspect.showUsage ? ["|", [ret.usage = usage, usageAlign, commandStyle]] : []),
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
        if (infoRow.length > 1) vlm.log();
        vlm.log(module.describe);
      }
      if (introspect.showCode) {
        if (shell.test("-f", info[3])) {
          const scriptSource = String(shell.head({ "-n": 1000000 }, info[3]));
          vlm.log(cardinal.highlight(scriptSource,
              { theme: cardinal.tomorrowNight, linenos: true }));
        } else {
          vlm.log(`Cannot read command '${name}' script source from:`, info[3]);
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
    const packagePath = vlm.path.join(remaining, "package.json");
    if (shell.test("-f", packagePath)) {
      const packageJson = JSON.parse(shell.head({ "-n": 1000000 }, packagePath));
      return [packageJson.version, packageJson.name, poolPath, realPath];
    }
    remaining = vlm.path.join(remaining, "..");
  }
  return ["<missing_command_package>", "<missing_command_package>", poolPath, realPath];
}

async function _tryInteractive (subVargv, subYargs) {
  const interactiveOptions = subYargs.getOptions().interactive;
  if (!vlm.interactive || !interactiveOptions) return subVargv;
  delete subYargs.getOptions().interactive;
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
    if (!question.choices && option.choices) question.choices = [...option.choices];
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
  // FIXME(iridian): handle de-hyphenations, camelcases etc. all other option variants.
  // Now only updating the verbatim option.
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

function getPackageConfig (...keys) { return _getConfigAtPath(this.packageConfig, keys); }
function getValmaConfig (...keys) { return _getConfigAtPath(this.valmaConfig, keys); }

function _getConfigAtPath (root, keys) {
  [].concat(...keys)
      .filter(key => (key !== undefined))
      .reduce((result, key) => ((result && (typeof result === "object")) ? result[key] : undefined),
          root);
}

function updatePackageConfig (updates) {
  if (!vlm.packageConfig) {
    throw new Error("vlm.updatePackageConfig: cannot update package.json as it doesn't exist");
  }
  const updatedConfig = _deepAssign(vlm.packageConfig, updates);
  if (updatedConfig !== vlm.packageConfig) {
    packageConfigStatus.updated = true;
    vlm.packageConfig = updatedConfig;
    vlm.ifVerbose(1)
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
    vlm.ifVerbose(1)
        .info("valma.json updated:", updates);
  }
}

// Toolset vlm functions

function getToolsetConfig (toolsetName) {
  return this.getValmaConfig("toolset", toolsetName);
}

function getToolConfig (toolsetName, toolName) {
  return this.getValmaConfig("toolset", toolsetName, "tool", toolName);
}

function confirmToolsetExists (toolsetName) {
  if (this.getToolsetConfig(toolsetName)) return true;
  this.warn(`Cannot find toolset '${toolsetName}' from configured toolsets:`,
      Object.keys(this.getValmaConfig("toolset") || {}).join(", "));
  return false;
}

function updateToolsetConfig (toolsetName, update) {
  return this.updateValmaConfig({ toolset: { [toolsetName]: update } });
}

function updateToolConfig (toolsetName, toolName, update) {
  return this.updateValmaConfig({ toolset: { [toolsetName]: { tool: { [toolName]: update } } } });
}

function createStandardToolsetOption (description) {
  return {
    type: "string", default: this.toolset,
    description,
    interactive: {
      type: "input", when: "if-undefined",
      confirm: value => this.confirmToolsetExists(value),
    },
  };
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
    return reorderedConfig;
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
      if (attributes.default && attributes.choices) {
        attributes.choices =
            (Array.isArray(attributes.default) ? attributes.default : [attributes.default])
              .filter(defaultValue => !attributes.choices.includes(defaultValue))
              .concat(attributes.choices);
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
      const { argv } = yargsParser(effects, { ...options });
      for (const effect of Object.keys(argv)) {
        const defaultValue = options.default[effect];
        if (effect !== "_" && (argv[effect] !== vargv[effect]) && (argv[effect] !== defaultValue)
            && (argv[effect] || (defaultValue !== undefined))) {
          if (defaultValue && (vargv[effect] !== defaultValue)) {
            throw new Error(`Conflicting effect '${effect}' has its default value '${defaultValue
                }' explicitly set to '${vargv[effect]}' and caused to '${argv[effect]}'`);
          }
          vargv[effect] = argv[effect];
        }
      }
    }
    return vargv;
  };
  return ret;
}
