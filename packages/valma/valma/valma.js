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
const yargs = require("yargs/yargs");
const yargsParser = require("yargs-parser").detailed;

cardinal.tomorrowNight = require("cardinal/themes/tomorrow-night");

/* eslint-disable vars-on-top, no-loop-func, no-restricted-syntax, no-cond-assign,
                  import/no-dynamic-require
*/

const globalVargs = _createVargs(process.argv.slice(2));

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
  poolDirectories: ["valma.bin/", "node_modules/.bin/"],
  globalPool: process.env.VLM_GLOBAL_POOL || (shell.which("vlm") || "").slice(0, -3),
};

const defaultCommandPrefix = "valma-";

// vlm - the Valma global API singleton - these are available to all command scripts via their
// yargs.vlm (in scripts exports.builder) as well as yargv.vlm (in scripts exports.handler).
const vlm = globalVargs.vlm = {
  // Calls valma command with argv.
  // Any plain objects are expanded to boolean or parameterized flags depending on the value type.
  invoke,

  // Executes an external command and returns a promise of the command stdandard output as string.
  // Any plain objects are expanded to boolean or parameterized flags depending on the value type.
  execute,

  // Immutable contents of package.json (contains pending updates as well)
  packageConfig: undefined,

  // Immutable contents of toolsets.json (contains pending updates as well)
  toolsetsConfig: undefined,

  getPackageConfig,
  getValmaConfig,
  getToolsetsConfig,

  // Registers pending updates to the package.json config file (immediately updates
  // vlm.packageConfig) which are written to file only immediately before valma execution exits or
  // an external command is about to be executed.
  // TODO(iridian): Improve the flush semantics, maybe to flush-on-subcommand-success - now it's
  // just silly.
  updatePackageConfig,

  // Registers pending updates to the toolsets.json config file (immediately updates
  // vlm.toolsetsConfig) which are written to file only immediately before valma execution exits or
  // an external command is about to be executed.
  // TODO(iridian): Improve the flush semantics, maybe to flush-on-subcommand-success - now it's
  // just silly.
  updateToolsetsConfig,

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

  contextCommand: "vlm",

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
      console.warn(this.colors.warning(`${this.contextCommand} warns:`, msg), ...rest);
    }
    return this;
  },
  // When something is definitely wrong and operation cannot do everything that was expected
  // but might still complete.
  // As a diagnostic message outputs to stderr where available.
  error (msg, ...rest) {
    if (this.colors.error) {
      console.error(this.colors.error(`${this.contextCommand} laments:`, msg), ...rest);
    }
    return this;
  },
  // When something is catastrophically wrong and operation terminates immediately.
  // As a diagnostic message outputs to stderr where available.
  exception (error, ...rest) {
    if (this.colors.exception) {
      console.error(this.colors.exception(`${this.contextCommand} panics:`, String(error)), ...rest);
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
      console.warn(this.colors.info(`${this.contextCommand} informs:`, msg), ...rest);
    }
    return this;
  },
  instruct (msg, ...rest) {
    if (this.colors.instruct) {
      console.warn(this.colors.instruct(`${this.contextCommand} instructs:`, msg), ...rest);
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
      console.warn(this.colors.babble(`${this.contextCommand} babbles:`, msg), ...rest);
    }
    return this;
  },

  // Expound messages can be arbitrarily immense.
  // As a diagnostic message outputs to stderr where available.
  expound (msg, ...rest) {
    if (this.colors.expound) {
      console.warn(this.colors.expound(`${this.contextCommand} expounds:`, msg), ...rest);
    }
    return this;
  },
};

colors._setTheme = function _setTheme (obj) {
  const createDecorator = (rule) => {
    if (rule === undefined) return (...rest) => rest.map(a => String(a)).join("");
    if (typeof rule === "string") return createDecorator(this[rule]);
    if (typeof rule === "function") return (...rest) => rule.apply(this, rest);
    if (Array.isArray(rule)) {
      return rule.map(createDecorator).reduceRight(
          (next, cur) => (...rest) => next(...[].concat(cur(...rest))));
    }
    const decorateFirst = createDecorator(rule.first);
    const decorateRest = createDecorator(rule.rest);
    return (first, ...rest) => (!rest.length
        ? decorateFirst(first)
        : `${decorateFirst(first)} ${decorateRest(...rest)}`);
  };
  Object.keys(obj).forEach(name => { this[name] = createDecorator(obj[name]); });
};

colors._setTheme({
  flatsplit: (...rest) => [].concat(...[].concat(...rest).map(entry => String(entry).split(" "))),
  echo: "dim",
  warning: ["bold", "yellow"],
  error: ["bold", "red"],
  exception: ["bold", "red"],
  info: "cyan",
  instruct: ["bold", "cyan"],
  babble: "cyan",
  expound: "cyan",
  argument: ["blue", "bold"],
  executable: ["flatsplit", { first: ["magenta"], rest: "argument" }],
  command: ["flatsplit", { first: ["magenta", "bold"], rest: "argument" }],
  overridden: ["strikethrough", "command"],
});

module.exports = {
  command: "vlm [--help] [-<flags>] [--<option>=<value> ...] <command> [parameters]",
  describe: "Dispatch a valma command to its command script",
  introduction: `Valma (or 'vlm') is a command script dispatcher.

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
  //    .usage(module.exports.command, module.exports.describe, iy => iy)
      .options({
        a: {
          group: "Valma root options:",
          alias: "match-all", type: "boolean", global: false,
          description: "Include hidden and disabled commands in /all/ matchings",
        },
        p: {
          group: "Valma root options:",
          alias: "pools", type: "boolean", global: false,
          description: "Show overridden pool commands and empty pool headers.",
        },
        s: {
          group: "Valma root options:",
          alias: "silence-echo", type: "boolean", global: false,
          description: "Silence the command invokes and executes echo",
        },
        v: {
          group: "Valma root options:",
          alias: "verbose", count: true, global: false,
          description: "Be noisy. -vv... -> be more noisy.",
        },
        warnings: {
          group: "Valma root options:",
          type: "boolean", global: false, default: true,
          description: "Show warning messages",
        },
        babbles: {
          group: "Valma root options:",
          type: "boolean", global: false, default: true,
          description: "Show babble messages",
        },
        expounds: {
          group: "Valma root options:",
          type: "boolean", global: false, default: true,
          description: "Show expound messages",
        },
        interactive: {
          group: "Valma root options:",
          type: "boolean", default: true, global: false,
          description: "Prompt for missing fields. If false then missing required fields will throw"
        },
        promote: {
          group: "Valma root options:",
          type: "boolean", default: true, global: false,
          description: "Promote to 'vlm' in the most specific pool available via forward",
        },
        "npm-config-env": {
          group: "Valma root options:",
          type: "boolean", default: true, global: false,
          description: "Add npm global environment if they are missing",
        },
        "package-config-env": {
          group: "Valma root options:",
          type: "boolean", default: false, global: false,
          description: "Add npm package environment variables if they are missing (not implemented)",
        },
        forward: {
          group: "Valma root options:",
          type: "boolean", default: true, global: false,
          description: "Allow vlm forwarding due to promote, node-env or need to load vlm path",
        },
        "command-prefix": {
          group: "Valma root options:",
          type: "string", default: defaultCommandPrefix, global: false,
          description: "The command prefix valma uses to recognize command script files.",
        },
        "pool-base": {
          group: "Valma root options:",
          type: "string", default: defaultPaths.poolBase, global: false,
          description: "Initial pool base path for gathering pools through all parent paths.",
        },
        "pool-directories": {
          group: "Valma root options:", array: true,
          type: "string", default: defaultPaths.poolDirectories, global: false,
          description: "Pool directories are appended to current pool base to locate pools",
        },
        "global-pool": {
          group: "Valma root options:",
          type: "string", default: defaultPaths.globalPool || null, global: false,
          description: "Global pool path is the last pool to be searched",
        },
        "bash-completion": {
          group: "Valma root options:",
          type: "boolean", global: false,
          description: "Output bash completion script",
        },
      }),
  handler, // Defined below.
};

function _addUniversalOptions (vargs_, { strict = true, global = false, hidden = false }) {
  function _postProcess (options) {
    Object.keys(options).forEach(name => {
      if (options[name].hidden) delete options[name].group;
    });
    return options;
  }
  return vargs_
      .strict(strict)
      .help(false)
      .version(false)
      .wrap(vargs_.terminalWidth() < 140 ? vargs_.terminalWidth() : 140)
      .option(_postProcess({
        h: {
          group: `Universal options${!hidden ? "" : " ('vlm -h <cmd>' for full list)"}:`,
          alias: "help",
          type: "boolean", global,
          description: "Show the main help of the command",
        },
        d: {
          group: `Universal options${!hidden ? "" : " ('vlm -h <cmd>' for full list)"}:`,
          alias: "dry-run",
          type: "boolean", global,
          description: "Do not execute but display all the matching command(s)",
        },
        N: {
          group: "Universal options:", alias: "show-name",
          type: "boolean", global, hidden,
          description: "Show the command (N)ame column",
        },
        U: {
          group: "Universal options:", alias: "show-usage",
          type: "boolean", global, hidden,
          description: "Show the command (U)sage column",
        },
        D: {
          group: "Universal options:", alias: "show-description",
          type: "boolean", global, hidden,
          description: "Show the command one-liner (D)escription column",
        },
        P: {
          group: "Universal options:", alias: "show-package",
          type: "boolean", global, hidden,
          description: "Show the command (P)ackage name column",
        },
        V: {
          group: "Universal options:", alias: ["show-version", "version"],
          type: "boolean", global, hidden,
          description: "Show the command (V)ersion column",
        },
        O: {
          group: "Universal options:", alias: "show-pool",
          type: "boolean", global, hidden,
          description: "Show the command source p(O)ol column",
        },
        F: {
          group: "Universal options:", alias: "show-file",
          type: "boolean", global, hidden,
          description: "Show the command (F)ile path column",
        },
        R: {
          group: "Universal options:", alias: "show-resolved",
          type: "boolean", global, hidden,
          description: "Show the command symlink-(R)esolved path column",
        },
        I: {
          group: "Universal options:", alias: "output-introduction",
          type: "boolean", global, hidden,
          description: "Output the full (I)ntroduction of the command",
        },
        S: {
          group: "Universal options:", alias: "output-source",
          type: "boolean", global, hidden,
          description: "Output the script (S)ource code of the command",
        },
      }));
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

_addUniversalOptions(globalVargs, { strict: !vlm.isCompleting, hidden: false });
module.exports.builder(globalVargs);
const globalVargv = _parseUntilCommand(globalVargs, processArgv, "command");

const _commandPrefix = globalVargv.commandPrefix;

vlm.verbosity = vlm.isCompleting ? 0 : globalVargv.verbose;
vlm.interactive = vlm.isCompleting ? 0 : globalVargv.interactive;
if (globalVargv.silenceEcho || vlm.isCompleting) vlm.echo = function noEcho () { return this; };
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
// When a command begins with ./ or contains the command prefix (if it is non-empty) it is
// considered a direct file valma command. It's parent directory is made the initial "file" pool.
let poolBase = globalVargv.poolBase;
if ((_commandPrefix && (globalVargv.command || "").includes(_commandPrefix))
    || (globalVargv.command || "").slice(0, 2) === "./") {
  if (globalVargv.isCompleting) process.exit(0); // Let bash filename completion do its thing.
  const commandMatcher = new RegExp(`(.*/)?(\\.?)${_commandPrefix}(.*?)(.js)?$`);
  const match = globalVargv.command.match(commandMatcher);
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
const toolsetsConfigStatus = {
  path: vlm.path.join(process.cwd(), "toolsets.json"), updated: false,
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

  const needNPM = !fullyBuiltin && vargv.npmConfigEnv && !process.env.npm_package_name;
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

  _reloadPackageAndToolsetsConfigs();

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

async function callValmaWithEcho (commandSelector, args) {
  // Remove everything after space so that exports.command can be given as commandSelector as-is
  // (they occasionally have yargs usage arguments after the command selector).
  const selector = commandSelector.split(" ")[0];
  const argv = _processArgs(args);
  vlm.echo("    ->> vlm", vlm.colors.command(selector, ...argv));
  try {
    const ret = await invoke.call(this, selector, argv);
    vlm.echo("    <<- vlm", `${vlm.colors.command(selector)}:`,
        vlm.colors.blue((JSON.stringify(ret) || "undefined").slice(0, 71)));
    return ret;
  } catch (error) {
    vlm.echo("    <<- vlm", `${vlm.colors.command(selector)}:`,
        vlm.colors.exception("exception:", error));
    throw error;
  }
}

async function invoke (commandSelector, argv) {
  if (!Array.isArray(argv)) {
    throw new Error(`vlm.invoke: argv must be an array, got ${typeof argv}`);
  }
  if (!this || !this.ifVerbose) {
    throw new Error(`vlm.invoke: 'this' must be a valid vlm context`);
  }

  const contextVargv = this.contextVargv;
  const commandGlob = _underToSlash((contextVargv.matchAll || this.isCompleting)
      ? _globFromPrefixSelector(commandSelector, contextVargv.matchAll)
      : _globFromExactSelector(commandSelector || "*"));
  const isWildcardCommand = !commandSelector || (commandSelector.indexOf("*") !== -1);
  const introspect = _determineIntrospection(
      module.exports, contextVargv, commandSelector, isWildcardCommand, true);

  // Phase 3: filter available command pools against the command glob

  this.ifVerbose(1)
      .babble("phase 3, invoke", this.colors.command(commandGlob, ...argv),
          "\n\tisWildcard:", isWildcardCommand, ", introspect options:", !!introspect);
  this.ifVerbose(2)
      .expound("introspect:", introspect)
      .expound("contextVargv:", { ...contextVargv, vlm: "<hidden>" });

  const activeCommands = _selectActiveCommands(this, _activePools, commandGlob, argv, introspect);

  if (this.isCompleting || contextVargv.bashCompletion) {
    globalVargs.completion("bash-completion", (current, argvSoFar) => {
      const rule = _underToSlash(_globFromPrefixSelector(argvSoFar._[1], argvSoFar.matchAll));
      const ret = [].concat(..._activePools.map(pool => pool.listing
          .filter(node => !_isDirectory(node) && minimatch(_underToSlash(node.name || ""), rule,
              { dot: argvSoFar.matchAll }))
          .map(node => _valmaCommandFromPath(node.name))));
      return ret;
    });
    _parse(globalVargs, contextVargv.bashCompletion ? ["bash-completion"] : process.argv.slice(2));
    return 0;
  }

  this.ifVerbose(2)
      .expound("activeCommands: {", ...Object.keys(activeCommands).map(
                key => `\n\t\t${key}: ${activeCommands[key].filePath}`),
          "\n\t}");

  if (introspect) {
    const ret = _outputIntrospection(globalVargs, introspect, activeCommands, commandGlob,
        isWildcardCommand, contextVargv.matchAll);
    return isWildcardCommand ? ret : ret[0];
  }

  if (!isWildcardCommand && !Object.keys(activeCommands).length) {
    vlm.error(`cannot find command '${vlm.colors.command(commandSelector)}' from active pools:`,
        ..._activePools.map(activePool => `\n\t"${vlm.path.join(activePool.path, commandGlob)}"`));
    return -1;
  }

  // Phase 4: Dispatch the command(s)

  const dryRunCommands = contextVargv.dryRun && {};
  let ret = [];

  this.ifVerbose(1)
      .babble("phase 4, dispatch:", ...(dryRunCommands ? ["--dry-run"] : []),
          this.colors.command(commandGlob, ...argv),
          "\n\tactive commands:", ...Object.keys(activeCommands).map(c => vlm.colors.command(c)));
  globalVargs.help();

  // Reverse order to have matching global command names execute first (still obeying overrides)
  for (const activePool of _activePools.slice().reverse()) {
    for (const commandName of Object.keys(activePool.commands).sort()) {
      const activeCommand = activeCommands[commandName];
      if (!activeCommand) continue;
      const module = activeCommand.module;
      delete activeCommands[commandName];
      if (dryRunCommands) {
        dryRunCommands[commandName] = activeCommand;
        continue;
      }
      if (!module) {
        vlm.error(`missing symlink target for`, vlm.colors.command(commandName),
            "ignoring command script at", activeCommand.filePath);
        continue;
      }

      const subVargv = _parse(activeCommand.subVargs, [commandName, ...argv],
          { vlm: activeCommand.vlm });

      const subIntrospect = _determineIntrospection(module, subVargv, commandName);
      this.ifVerbose(3)
          .babble("parsed:", this.colors.command(commandName, ...argv),
              activeCommand.disabled ? `: disabled, ${activeCommand.disabled}` : ""
      ).ifVerbose(4)
          .expound("\tsubArgv:", subVargv)
          .expound("\tsubIntrospect:", subIntrospect);

      if (subIntrospect) {
        ret = ret.concat(_outputIntrospection(activeCommand.subVargs,
            subIntrospect, { [commandName]: activeCommand }, commandSelector,
            isWildcardCommand, subVargv.matchAll));
      } else if (isWildcardCommand && activeCommand.disabled) {
        this.ifVerbose(1)
            .info(`Skipping disabled command '${this.colors.command(commandName)}'`,
                `during wildcard invokation (${activeCommand.disabled})`);
        continue;
      } else {
        if (activeCommand.disabled) {
          this.warn(`invoking a disabled command '${commandName}' explicitly`,
              `(${activeCommand.disabled})`);
        }
        subVargv.vlm.contextVargv = subVargv;
        if (isWildcardCommand) {
          this.echo("    >>> vlm", this.colors.command(commandName, ...argv));
        }
        await _tryInteractive(subVargv, activeCommand.subVargs);
        if (subVargv.vlm.toolset) {
          const pathDepPath = ["commands", commandName, "pathDependencies"];
          const pathDependencies = subVargv.vlm.tool
              ? subVargv.vlm.getToolConfig(subVargv.vlm.toolset, subVargv.vlm.tool, ...pathDepPath)
              : subVargv.vlm.getToolsetConfig(subVargv.vlm.toolset, ...pathDepPath);
          await Promise.all(Object.keys(pathDependencies || {}).map(async dependedPath => {
            if (shell.test("-e", dependedPath)) return undefined;
            this.echo("    >>>> dependent", this.colors.yellow(dependedPath));
            const command = pathDependencies[dependedPath].split(" ");
            const dependedRet = await ((command[0] === "vlm")
                ? subVargv.vlm.invoke(command[1], command.slice(2))
                : subVargv.vlm.execute(command[0], command.slice(1)));
            this.echo("    <<<< dependent", this.colors.yellow(dependedPath), ":",
                this.colors.blue(dependedRet));
            return dependedRet;
          }));
        }
        ret.push(await module.handler(subVargv));
        if (this.echo && (commandName !== commandSelector)) {
          let retValue = JSON.stringify(ret[ret.length - 1]);
          if (retValue === undefined) retValue = "undefined";
          if (isWildcardCommand) {
            this.echo("    <<< vlm", `${this.colors.command(commandName)}:`,
                this.colors.blue(retValue.slice(0, 20), retValue.length > 20 ? "..." : ""));
          }
        }
      }
    }
  }
  if (dryRunCommands) {
    _outputIntrospection(globalVargs, _determineIntrospection(module, contextVargv),
        dryRunCommands, commandSelector, isWildcardCommand, contextVargv.matchAll);
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

// If the command begins with a dot, insert the command prefix _after_ the dot; this is useful
// as directories beginning with . don't match /**/ and * glob matchers and can be considered
// implementation detail.
function _globFromExactSelector (commandBody) {
  return !commandBody ? _commandPrefix
      : (commandBody[0] === ".") ? `.${_commandPrefix}${commandBody.slice(1)}`
      : `${_commandPrefix}${commandBody}`;
}

function _globFromPrefixSelector (partialCommand = "", matchAll) {
  return matchAll && !((partialCommand || "")[0] === ".")
      ? `{.,}${_commandPrefix}${partialCommand || ""}{,*/**/}*`
      : `${_globFromExactSelector(partialCommand)}{,*/**/}*`;
}

function _valmaCommandFromPath (pathname) {
  const match = pathname.match(new RegExp(`(\\.?)${_commandPrefix}(.*)`));
  return _underToSlash(`${match[1]}${match[2]}`);
}

function _underToSlash (text = "") {
  if (typeof text !== "string") throw new Error(`expected string, got: ${JSON.stringify(text)}`);
  return text.replace(/_/g, "/");
}

function _outputCommandInfo (elements) {
  console.log(...elements.map(entry => (!Array.isArray(entry)
      ? entry
      : (entry[2] || (i => i))(_rightPad(entry[0], entry[1])))));
}

function _rightPad (text, width = 0) {
  const text_ = (typeof text === "string") ? text : `<${typeof text}>`;
  const pad = width - text_.length;
  return `${text_}${" ".repeat(pad < 0 ? 0 : pad)}`;
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
        vlm.warn(`node_modules missing for ${packageJsonPath}!`,
            "\nSome dependent commands will likely be missing.",
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

function _selectActiveCommands (contextVLM, activePools, commandGlob, argv, introspect) {
  if (introspect && introspect.identityPool) return introspect.identityPool.commands;
  const ret = {};
  for (const pool of activePools) {
    if (!pool.commands) pool.commands = {};
    pool.stats = {};
    pool.listing.forEach(file => {
      const normalizedName = _underToSlash(file.name);
      const matches = minimatch(normalizedName, commandGlob,
          { dot: contextVLM.contextVargv.matchAll });
      contextVLM.ifVerbose(3)
          .babble(`evaluating file ${file.name}`, "matches:", matches, "vs glob:", commandGlob,
          ", dir:", _isDirectory(file), ", normalizedName:", normalizedName);
      if (!matches) {
        pool.stats.nonmatching = (pool.stats.nonmatching || 0) + 1;
        return;
      }
      if (_isDirectory(file)) return;
      const commandName = _valmaCommandFromPath(file.name);
      const poolCommand = pool.commands[commandName] || (pool.commands[commandName] = {
        name: commandName, pool, file, filePath: vlm.path.join(pool.path, file.name),
      });
      if (ret[commandName]) {
        pool.stats.overridden = (pool.stats.overridden || 0) + 1;
        return;
      }
      if (!poolCommand.module && shell.test("-e", poolCommand.filePath)) {
        poolCommand.module = require(poolCommand.filePath);
        contextVLM.ifVerbose(3)
          .babble(`    command ${commandName} module found at path`, poolCommand.filePath);
      }
      const module = poolCommand.module;
      if (!module || !module.command || !module.describe || !module.handler) {
        if (vlm.isCompleting || introspect || contextVLM.contextVargv.dryRun) {
          ret[commandName] = { ...poolCommand };
          return;
        }
        throw new Error(`invalid command '${commandName}' script file '${poolCommand.filePath
            }': can't open for reading or exports.command, ...describe or ...handler missing`);
      }

      const subVargs = _createVargs([commandName, ...argv]);
      _addUniversalOptions(subVargs, { global: true, hidden: !globalVargv.help });

      subVargs.vlm = Object.assign(Object.create(contextVLM),
          module.vlm,
          { contextCommand: commandName });

      const activeCommand = ret[commandName] = {
        ...poolCommand,
        subVargs,
        vlm: subVargs.vlm,
        disabled: (module.disabled
            && ((typeof module.disabled !== "function")
                    ? `exports.disabled == ${String(module.disabled)}`
                : (module.disabled(subVargs)
                    && `exports.disabled => ${String(module.disabled(subVargs))}`))),
      };

      if (!module.builder || !module.builder(subVargs)) {
        if (!activeCommand.disabled) activeCommand.disabled = "exports.builder => falsy";
      }

      subVargs.command(module.command, module.describe);
      if (!activeCommand.disabled || contextVLM.contextVargv.matchAll) {
        globalVargs.command(module.command, module.describe,
            ...(!activeCommand.disabled && module.builder ? [module.builder] : []), () => {});
      } else {
        pool.stats.disabled = (pool.stats.disabled || 0) + 1;
      }
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
  if (globalVargv.packageConfigEnv) {
    vlm.error("did not load npm_package_* variables (not implemented yet)");
  }
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

function listMatchingCommands (commandSelector, matchAll = false) {
  const minimatcher = _underToSlash(_globFromExactSelector(commandSelector || "*"));
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
          vlm.colors.command(commandSelector),
          ...(vlm.verbosity > 1 ? [", minimatcher:", minimatcher] : []),
          "\n\tresults:", ret);
  return ret;
}

function listAllMatchingCommands (commandSelector) {
  return listMatchingCommands.call(this, commandSelector, true);
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
function execute (executable, args, spawnOptions = {}) {
  return new Promise((resolve, failure) => {
    _flushPendingConfigWrites(vlm);
    const argv = _processArgs(args);
    vlm.echo("    -->", vlm.colors.executable(executable, ...argv));
    if (vlm.contextVargv && vlm.contextVargv.dryRun && !spawnOptions.noDryRun) {
      vlm.echo("      dry-run: skipping execution and returning:",
          vlm.colors.blue(spawnOptions.dryRunReturn || 0));
      _onDone(spawnOptions.dryRunReturn || 0);
    } else {
      const subProcess = childProcess.spawn(
          executable,
          argv, {
            stdio: ["inherit", "inherit", "inherit"],
            ...spawnOptions,
            detached: true,
          },
      );
      subProcess.on("exit", _onDone);
      subProcess.on("error", _onDone);
      process.on("SIGINT", () => {
        vlm.warn("vlm killing:", vlm.colors.green(executable, ...argv));
        process.kill(-subProcess.pid, "SIGTERM");
        process.kill(-subProcess.pid, "SIGKILL");
      });
      process.on("SIGTERM", () => {
        vlm.warn("vlm killing:", vlm.colors.green(executable, ...argv));
        process.kill(-subProcess.pid, "SIGTERM");
        process.kill(-subProcess.pid, "SIGKILL");
      });
    }
    function _onDone (code, signal) {
      if (code || signal) {
        vlm.echo("    <--", `${vlm.colors.executable(executable)}:`,
            vlm.colors.error("<error>:", code || signal));
        failure(code || signal);
      } else {
        _refreshActivePools();
        _reloadPackageAndToolsetsConfigs();
        vlm.echo("    <--", `${vlm.colors.executable(executable)}:`,
            vlm.colors.warning("execute return values not implemented yet"));
        resolve();
      }
    }
  });
}

// All nulls and undefines are filtered, arrays are flattened/expanded. Booleans are filtered if
// not inside object values. Objects are expanded with keys as "--key" and rest depending on value
// type like so: ["y", { foo: "bar", val: true, nothing: null, neg: false, bar: ["xy", false, 0] }]
//            -> ["y", "--foo", "bar", "--val", "--no-neg", "--bar", "xy", "--no-bar", "--bar", 0]
function _processArgs (args) {
  return [].concat(...[].concat(args).map(entry =>
    (Array.isArray(entry)
        ? _processArgs(entry)
    : (!entry || typeof entry !== "object")
        ? _toArgString(entry)
        : [].concat(...Object.keys(entry).map(key => _toArgString(entry[key], key))))));

  function _toArgString (value, key) {
    if ((value === undefined) || (value === null)) return [];
    if (typeof value === "string") return !key ? value : [`--${key}`, value];
    if (typeof value === "boolean") return !key ? [] : value ? `--${key}` : `--no-${key}`;
    if (Array.isArray(value)) return [].concat(...value.map(entry => _toArgString(entry, key)));
    return JSON.stringify(value);
  }
}

function _determineIntrospection (module, vargv, selector, isWildcard, invokeEntry) {
  const ret = {
    module, show: {},
    outputSource: vargv.outputSource, outputIntroduction: vargv.outputIntroduction,
  };
  Object.keys(vargv).forEach(key => {
    if (vargv[key] && (key.slice(0, 5) === "show-")) ret.show[key.slice(5)] = vargv[key];
  });
  if ((globalVargv.help || vargv.help) && (!selector || !invokeEntry)) return { builtinHelp: true };
  ret.entryIntro = Object.keys(ret.show).length || vargv.outputIntroduction || vargv.outputSource;

  if (selector && !ret.entryIntro) return undefined;
  if (!selector && ret.entryIntro && !vargv.dryRun && !vargv.matchAll) {
    // Introspect context
    ret.identityPool = { path: path.dirname(process.argv[1]), commands: {} };
    ret.identityPool.commands.vlm = {
      name: "vlm", module, filePath: __filename, pool: ret.identityPool,
    };
  }
  if (!selector && !ret.entryIntro && !vargv.dryRun) { // show default listing
    ret.defaultUsage = true;
    ret.show.usage = true;
    ret.show.description = true;
  }
  ret.displayHeaders = isWildcard && !ret.identityPool;
  if (!ret.show.name && !ret.show.usage) {
    if (!isWildcard && vargv.dryRun) ret.show.usage = true;
    else if (!ret.entryIntro) ret.show.name = true;
  }
  return ret;
}

function _outputIntrospection (vargs_, introspect, commands_, commandGlob, isWildcard_, matchAll) {
  if (introspect.builtinHelp) {
    vargs_.vlm = vlm;
    vargs_.showHelp("log");
    return [];
  }
  let introedCommands = commands_;
  if (introspect.identityPool) {
    introedCommands = introspect.identityPool.commands;
    return [_outputInfos(introspect.identityPool)];
  }
  if (introspect.defaultUsage) {
    if (!matchAll) {
      vlm.log(colors.bold("# Usage:", introspect.module.command));
      vlm.log();
    }
    vlm.log(colors.bold(`# ${matchAll ? "All known" : "Available"} commands:`));
  }
  return [].concat(...[..._activePools].reverse().map(pool =>
      _outputInfos(pool, isWildcard_, globalVargv.pools)));

  function _outputInfos (pool, isWildcard, showOverridden) {
    const missingFile = "<file_missing>";
    const missingPackage = "<package_missing>";
    const _isOverridden = (command) => (introedCommands[command.name] || { pool }).pool !== pool;
    const _overridableCommandStyle = (command) =>
        (_isOverridden(command) ? colors.overridden : colors.command);
    const column = {
      name: { header: "command", style: _overridableCommandStyle },
      usage: { header: "usage", style: _overridableCommandStyle },
      description: { header: "description" },
      package: { header: "package" },
      version: { header: "version" },
      pool: { header: "source pool" },
      file: { header: "script path" },
      resolved: { header: "real file path" },
    };
    Object.keys(introspect.show).forEach(key => { column[key].width = 1; });
    function _addToRowData (rowData, name, entry) {
      if (column[name].width) {
        rowData[name] = entry;
        if ((typeof entry === "string") && (entry.length > column[name].width)) {
          column[name].width = entry.length;
        }
      }
    }
    const infos = Object.keys(pool.commands)
    .sort()
    .filter(name => pool.commands[name]
          && !(pool.commands[name].disabled && isWildcard && !matchAll)
          && !(_isOverridden(pool.commands[name]) && !showOverridden))
    .map(name => {
      const poolCommand = pool.commands[name];
      const info = _commandInfo(poolCommand.filePath, pool.path);
      const module = poolCommand.module
          || (poolCommand.module = info.resolvedPath && require(info.resolvedPath));
      const rowData = { disabled: !!poolCommand.disabled };
      _addToRowData(rowData, "name", poolCommand.disabled ? `(${name})` : name);
      _addToRowData(rowData, "usage", (module && module.command) || `${name} ${missingPackage}`);
      _addToRowData(rowData, "description", (module && module.describe) || missingPackage);
      _addToRowData(rowData, "package", info.package);
      _addToRowData(rowData, "version", info.version || missingPackage);
      _addToRowData(rowData, "pool", info.poolPath);
      _addToRowData(rowData, "file", info.filePath);
      _addToRowData(rowData, "resolved", info.resolvedPath || missingFile);
      return { command: poolCommand, name, module, info, rowData };
    });

    const isEmpty = !Object.keys(infos).length;
    if (isWildcard && (!isEmpty || globalVargv.pools || matchAll)) {
      vlm.log(colors.bold(`## ${vlm.path.join(pool.name, commandGlob)} ${
        isEmpty ? "has no shown commands" : "commands:"}`),
        `(${vlm.colors.info(Object.keys(pool.stats || {})
            .map(s => `${s}: ${pool.stats[s]}`).join(", "))
        })`);
    }
    if (isEmpty) return [];

    if (introspect.displayHeaders) {
      const headerOutput = [].concat(...Object.keys(introspect.show)
          .map(key => ([_rightPad(column[key].header, column[key].width), "|"])));
      vlm.log(...headerOutput.slice(0, -1).map(h => (h === "|" ? "|" : colors.bold(h))));
      vlm.log(...headerOutput.slice(0, -1).map(h => (h === "|" ? "|" : h.replace(/./g, "-"))));
    }
    return infos.map(({ command, name, module, info, rowData }) => {
      const rowOutput = [].concat(...Object.keys(introspect.show).map(key => [
        "|",
        [rowData[key], column[key].width, (column[key].style || (() => {}))(command)],
      ]));
      if (rowOutput.length > 1) _outputCommandInfo(rowOutput.slice(1));
      if (introspect.outputIntroduction) {
        if (!module || !(module.introduction || module.describe)) {
          vlm.warn(`Cannot read command '${name}' script introduction from:`, info.resolvedPath);
          rowData.Introduction = null;
        } else {
          if (rowOutput.length > 1) vlm.log();
          vlm.log(module.introduction || module.describe);
          if (rowOutput.length > 1) vlm.log();
          rowData.Introduction = module.introduction || module.describe;
        }
      }
      if (introspect.outputSource) {
        if (!module) {
          vlm.warn(`Cannot read command '${name}' script source from:`, info.resolvedPath);
          rowData.Source = null;
        } else {
          rowData.Source = String(shell.head({ "-n": 1000000 }, info.resolvedPath));
          vlm.log(cardinal.highlight(rowData.Source,
              { theme: cardinal.tomorrowNight, linenos: true }));
        }
      }
      if (Object.keys(introspect.show).length === 1) {
        return rowData[Object.keys(introspect.show)[0]];
      }
      return rowData;
    });
  }
}

function _commandInfo (filePath, poolPath) {
  const ret = { filePath, poolPath };
  if (!filePath || !shell.test("-e", filePath)) return ret;
  ret.resolvedPath = fs.realpathSync(filePath);
  let remaining = path.dirname(ret.resolvedPath);
  while (remaining !== "/") {
    const packagePath = vlm.path.join(remaining, "package.json");
    if (shell.test("-f", packagePath)) {
      const packageJson = JSON.parse(shell.head({ "-n": 1000000 }, packagePath));
      return { ...ret, version: packageJson.version, package: packageJson.name };
    }
    remaining = vlm.path.join(remaining, "..");
  }
  return ret;
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
    if (!question.message) question.message = option.description;
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


function _reloadPackageAndToolsetsConfigs () {
  if (shell.test("-f", packageConfigStatus.path)) {
    vlm.packageConfig = JSON.parse(shell.head({ "-n": 1000000 }, packageConfigStatus.path));
    _deepFreeze(vlm.packageConfig);
  }
  if (shell.test("-f", toolsetsConfigStatus.path)) {
    vlm.toolsetsConfig = JSON.parse(shell.head({ "-n": 1000000 }, toolsetsConfigStatus.path));
    _deepFreeze(vlm.toolsetsConfig);
  }
}

function getPackageConfig (...keys) { return _getConfigAtPath(this.packageConfig, keys); }
function getToolsetsConfig (...keys) { return _getConfigAtPath(this.toolsetsConfig, keys); }
function getValmaConfig (...keys) { return _getConfigAtPath(this.toolsetsConfig, keys); }

function _getConfigAtPath (root, keys) {
  return [].concat(...keys)
      .filter(key => (key !== undefined))
      .reduce((result, key) => ((result && (typeof result === "object")) ? result[key] : undefined),
          root);
}

function updatePackageConfig (updates) {
  if (typeof updates !== "object" || !updates) {
    throw new Error(`Invalid arguments for updatePackageConfig, expexted object, got ${
        typeof update}`);
  }
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

function updateToolsetsConfig (updates) {
  if (typeof updates !== "object" || !updates) {
    throw new Error(`Invalid arguments for updateToolsetsConfig, expexted object, got ${
        typeof update}`);
  }
  if (!vlm.toolsetsConfig) {
    vlm.toolsetsConfig = {};
    toolsetsConfigStatus.updated = true;
  }
  const updatedConfig = _deepAssign(vlm.toolsetsConfig, updates);
  if (updatedConfig !== vlm.toolsetsConfig) {
    toolsetsConfigStatus.updated = true;
    vlm.toolsetsConfig = updatedConfig;
    vlm.ifVerbose(1)
        .info("toolsets.json updated:", updates);
  }
}

// Toolset vlm functions

function getToolsetConfig (toolsetName, ...rest) {
  if (typeof toolsetName !== "string" || !toolsetName) {
    throw new Error(`Invalid arguments for getToolsetConfig, expexted string|..., got ${
        typeof toolsetName}`);
  }
  return this.getToolsetsConfig(toolsetName, ...rest);
}

function getToolConfig (toolsetName, toolName, ...rest) {
  if (typeof toolsetName !== "string" || typeof toolName !== "string"
      || !toolsetName || !toolName) {
    throw new Error(`Invalid arguments for getToolConfig, expexted string|string|..., got ${
        typeof toolsetName}|${typeof toolName}`);
  }
  return this.getToolsetsConfig(toolsetName, "tools", toolName, ...rest);
}

function confirmToolsetExists (toolsetName) {
  if (this.getToolsetConfig(toolsetName)) return true;
  this.warn(`Cannot find toolset '${toolsetName}' from configured toolsets:`,
      Object.keys(this.getToolsetsConfig() || {}).join(", "));
  return false;
}

function updateToolsetConfig (toolsetName, updates) {
  if (typeof toolsetName !== "string" || typeof updates !== "object" || !toolsetName || !updates) {
    throw new Error(`Invalid arguments for updateToolsetConfig, expexted string|object, got ${
        typeof toolsetName}|${typeof updates}`);
  }
  return this.updateToolsetsConfig({ [toolsetName]: updates });
}

function updateToolConfig (toolsetName, toolName, updates) {
  if (typeof toolsetName !== "string" || typeof toolName !== "string" || typeof updates !== "object"
      || !toolsetName || !toolName || !updates) {
    throw new Error(`Invalid arguments for updateToolConfig, expexted string|string|object, got ${
        typeof toolsetName}|${typeof toolName}|${typeof updates}`);
  }
  return this.updateToolsetsConfig({ [toolsetName]: { tools: { [toolName]: updates } } });
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
  _commitUpdates("toolsets.json", toolsetsConfigStatus, () => vlm.toolsetsConfig);
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

function _createVargs (args, cwd = process.cwd()) {
  // Get a proper, clean yargs instance for neat extending.
  const ret = yargs(args, cwd, require);

  // Extend option/options with:
  //   interactive
  //   causes
  const baseOptions = ret.options;
  ret.option = ret.options = function valmaOptions (opt, attributes_) {
    if (typeof opt === "object") { // Let yargs expand the options object
      baseOptions.call(this, opt, attributes_);
      return this;
    }
    const attributes = { ...attributes_ };
    const optionState = this.getOptions();
    if (attributes.interactive) {
      if (!optionState.interactive) optionState.interactive = {};
      optionState.interactive[opt] = attributes;
    }
    if (attributes.causes) {
      if (!optionState.causes) optionState.causes = {};
      optionState.causes[opt] = attributes.causes;
    }
    const subVLM = this.vlm;
    if (subVLM && subVLM.toolset) {
      const subPath = ["commands", subVLM.contextCommand, "options", opt];
      let default_ = subVLM.tool && subVLM.getToolConfig(subVLM.toolset, subVLM.tool, ...subPath);
      if (default_ === undefined) default_ = subVLM.getToolsetConfig(subVLM.toolset, ...subPath);
      if (default_ !== undefined) attributes.default = default_;
    }
    if (attributes.default && attributes.choices) {
      attributes.choices =
          (Array.isArray(attributes.default) ? attributes.default : [attributes.default])
            .filter(defaultValue => !attributes.choices.includes(defaultValue))
            .concat(attributes.choices);
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
