#!/usr/bin/env node

const minimatch = require("minimatch");
const path = require("path");
const shell = require("shelljs");

/* eslint-disable vars-on-top, no-var, no-loop-func, no-restricted-syntax, no-cond-assign,
                  import/no-dynamic-require
*/

var activePools = [];
var command;

const defaultPaths = {
  packagePool: "scripts/",
  dependedPool: "node_modules/.bin/",
  globalPool: process.env.VALMA_GLOBAL || (shell.which("vlm") || "").slice(0, -3),
};

// Phase 1: Pre-load args with so-far empty pools to detect fully builtin commands (which don't
// need forwarding).
// console.log("Phase 1:", process.argv, defaultPaths.globalPool, process.env.VALMA_GLOBAL,
//    process.env.VALMA_PATH, process.env.PATH);

var yargs = require("yargs")
    .option({
      l: {
        alias: "list", type: "boolean", default: false,
        description: "Lists scripts matching the command glob"
      },
      n: {
        alias: "no-node", type: "boolean", default: false,
        description: "Don't add node environment"
      },
      v: {
        alias: "verbose", default: false,
        description: "Be noisy"
      },
      "package-pool": {
        type: "string", default: defaultPaths.packagePool,
        description: "Package pool path is the first pool to be searched"
      },
      "depended-pool": {
        type: "string", default: defaultPaths.dependedPool,
        description: "Depended pool path is the second pool to be searched"
      },
      "global-pool": {
        type: "string", default: defaultPaths.globalPool || "",
        description: "Global pool path is the third pool to be searched"
      }
    })
    .completion("bash_completion", (current, argvSoFar) =>
        [].concat(...activePools.map(pool => pool.listing.map(s => !isDirectory(s) && s.name)))
          .filter(name => name && minimatch(name, `valma-${argvSoFar._[1] || ""}*`))
          .map(name => name.slice(6)));

// eslint-disable-next-line no-bitwise
function isDirectory (candidate) { return candidate.mode & 0x4000; }

var preYargv;
var needNode;
var shouldForward;
var verbosity = 0;

var fullyBuiltin = (process.argv[2] === "--get-yargs-completions");
if (!fullyBuiltin) {
  preYargv = yargs.help(false).argv;
  command = preYargv._[0];
  fullyBuiltin = preYargv.l || !preYargv._.length;
  verbosity = preYargv.v ? [].concat(preYargv.v).length : 0;
  needNode = !preYargv.noNode && !process.env.npm_package_name;
  shouldForward = needNode || !process.env.VALMA_PATH;
}

// Phase 2: Load pools and forward to 'vlm' if needed (if a more specific 'vlm' is found or if the
// node environment or 'vlm' needs to be loaded)
if (verbosity >= 2) console.log("Phase 2:", needNode, shouldForward, preYargv);

var moreSpecificValmaFound = false;
[
  { name: "package", path: (preYargv || defaultPaths).packagePool, rootPath: process.cwd() },
  { name: "depended", path: (preYargv || defaultPaths).dependedPool, rootPath: process.cwd() },
  { name: "global", path: (preYargv || defaultPaths).globalPool },
].forEach(pool => {
  if (!shell.test("-d", pool.path)) return;
  activePools.push(pool);
  pool.absolutePath = pool.rootPath ? path.resolve(pool.rootPath, pool.path) : pool.path;
  pool.listing = shell.ls("-lAR", pool.path);
  if (fullyBuiltin) return;
  if (process.argv[1].slice(0, pool.absolutePath.length) === pool.absolutePath) {
    moreSpecificValmaFound = true;
  }
  if (!shouldForward && moreSpecificValmaFound) return;
  if (!pool.listing.find(file => (file.name === "vlm"))) return;
  var prefix = needNode ? `npx -c '` : `node `;
  var suffix = needNode ? `'` : ``;
  if (!process.env.VALMA_PATH) {
    prefix = `VALMA_PATH=${pool.absolutePath} PATH=${pool.absolutePath}:$PATH ${prefix}`;
  }
  if (!process.env.VALMA_GLOBAL && (preYargv || defaultPaths).globalPool) {
    prefix = `VALMA_GLOBAL=${(preYargv || defaultPaths).globalPool} ${prefix}`;
  }
  const forwardArguments = process.argv.slice(2).map(a => JSON.stringify(a)).join(" ");
  if (verbosity) {
    console.log(`Forwarding to: ${prefix}${path.join(pool.absolutePath, "vlm")} ${
        forwardArguments}${suffix}`);
  }
  shell.exec(`${prefix}${path.join(pool.absolutePath, "vlm")} ${forwardArguments}${suffix}`);
  process.exit();
});

if (!fullyBuiltin && shouldForward) {
  console.error("vlm: could not locate 'vlm' forward in any pool",
      "while trying to load node environment variables");
  process.exit(-1);
}

// Phase 3: parse argv properly against the command pools which match the requested command
process.exit(callValma(
    (typeof (preYargv || {}).help === "string") ? preYargv.help : command,
    process.argv.slice(2)));

function callValma (command_, argv) {
  const commandGlob = `valma-${command_ || "*"}`;
  const activeCommands = {};
  if (verbosity >= 2) console.log("Phase 3:", commandGlob, argv);

  for (var pool of activePools) {
    pool.commands = {};
    pool.listing.forEach(file => {
      if (isDirectory(file) || !minimatch(file.name, commandGlob)) return;
      var commandName = file.name.slice(6);
      pool.commands[commandName] = { script: file, pool };
      if (activeCommands[commandName]) return;
      activeCommands[commandName] = pool.commands[commandName];
      if (!preYargv || preYargv.list) return;
      yargs = yargs.command(require(path.join(pool.absolutePath, file.name)));
    });
  }


  // Phase 4: perform the full yargs run, possibly evaluating a singular matching command

  var newDelays = [];
  if (verbosity >= 2) console.log("Phase 4:", argv, newDelays, "fuck you", activeCommands);

  const delayOptions = { vlm: (op, argv_, onDone) => newDelays.push({ op, argv: argv_, onDone }) };
  function unwindDelays () {
    var pendingDelays = newDelays;
    newDelays = [];
    for (var delay of pendingDelays) {
      var ret = callValma(delay.op, [delay.op].concat(delay.argv));
      if (delay.onDone) delay.onDone(delay.op, delay.argv, ret);
      unwindDelays();
    }
  }

  const yargv = yargs.help().parse(argv, delayOptions);
  unwindDelays();

  if (command_ && (command_.indexOf("*") === -1)) {
    if (Object.keys(activeCommands).length) return 0;
    console.log(`vlm: cannot find command '${command_}' from pools:`,
        ...activePools.map(emptyPool => `"${path.join(emptyPool.path, commandGlob)}"`));
    return -1;
  }

  // Phase 5: handle wildcard commands

  if (verbosity >= 2) console.log("Phase 5:", yargv._);

  // Have matching global command names execute first (while obeying overrides properly ofc.)
  activePools.reverse();

  if (!command_ || yargv.list) {
    if (!yargv.list) console.log("Simple usage: vlm [--help] [-l | --list] <command> [-- <args>]\n");
    var align = 0;
    for (var p of activePools) {
      Object.keys(p.commands).forEach(name => { if (name.length > align) align = name.length; });
    }
    for (var listPool of activePools) {
      if (!Object.keys(listPool.commands).length) {
        console.log(`\t'${listPool.name}' pool empty (with "${listPool.path}${commandGlob}")`);
      } else {
        console.log(`\t'${listPool.name}' pool commands (with "${
            listPool.path}${commandGlob}"):`);
        Object.keys(listPool.commands).forEach(commandName => {
          console.log(commandName, `${" ".repeat(align - commandName.length)}:`,
              `${listPool.path}valma-${commandName}`);
        });
        console.log();
      }
    }
    return 0;
  }

  var ret = 0;

  const commandArgs = yargv._.slice(1).map(arg => JSON.stringify(arg)).join(" ");
  for (var activePool of activePools) {
    for (var matchingCommandName of Object.keys(activePool.commands)) {
      var content = activeCommands[matchingCommandName];
      if (!content) continue;
      if (verbosity) {
        console.log(`Executing ${commandGlob} command: '${matchingCommandName} ${commandArgs}'`);
      }
      var module = require(path.join(content.pool.absolutePath, content.script.name));
      yargs.command(module.command, module.describe, module.builder, module.handler)
          .parse(`${matchingCommandName} ${commandArgs}`, delayOptions);
      unwindDelays();
      delete activeCommands[matchingCommandName];
    }
  }
  return ret;
}
