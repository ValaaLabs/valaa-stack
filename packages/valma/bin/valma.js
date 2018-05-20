#!/usr/bin/env node

const shell = require("shelljs");
const yargs = require("yargs");
/* eslint-disable vars-on-top, no-var, no-loop-func, no-restricted-syntax, no-cond-assign */

const packageName = "package.json";
const dependedPoolPath = "node_modules/.bin/";
var globalPoolPath;

function createCommonYargs () {
  return yargs.option({
    l: {
      alias: "list", type: "boolean", default: false,
      description: "Lists scripts matching the command glob"
    },
    n: {
      alias: "no-node", type: "boolean", default: false,
      description: "Don't add node environment"
    }
  });
}

var needNode;
var shouldForward;

var preYargv;

var fullyBuiltin = (process.argv[2] === "--get-yargs-completions");
if (!fullyBuiltin) {
  preYargv = createCommonYargs().argv;
  fullyBuiltin = preYargv.l || !preYargv._.length;
  needNode = !process.env.npm_package_name;
  shouldForward = needNode || (!process.env.VALMA_LOCAL && !process.env.VALMA_GLOBAL);
}

// console.log("ENTRY:", needNode, shouldForward, process.argv, preYargv);

// Phase 1:
// Load pools and forward to 'vlm' if needed (if a more specific 'vlm' is found or if the
// node environment or 'vlm' needs to be loaded)

function forwardToValma (forwardValmaPrefix) {
  if (fullyBuiltin) return;

  const path = require("path");

  const hasGlobalValma = shell.which("vlm");
  var prefix = needNode ? `npx -c "` : "node ";
  var suffix = needNode ? `"` : "";
  if (hasGlobalValma && !process.env.VALMA_GLOBAL) {
    prefix = `VALMA_GLOBAL=${hasGlobalValma} ${prefix}`;
  } else if (!process.env.VALMA_LOCAL) {
    const valmaLocal = path.resolve(process.cwd(), forwardValmaPrefix || "bin");
    prefix = `VALMA_LOCAL=${valmaLocal} PATH=$PATH:${valmaLocal} ${prefix}`;
  }
  const vlmPath = forwardValmaPrefix ? "vlm" : path.join("bin", "vlm");
  const forwardArguments = process.argv.slice(2).map(a => JSON.stringify(a)).join(" ");
  // console.log(`Forwarding to valma at: ${prefix}${forwardValmaPrefix}${vlmPath}${suffix}`);
  shell.exec(`${prefix}${forwardValmaPrefix}${vlmPath} ${forwardArguments}${suffix}`);
  process.exit();
}

var commandPools = [];

var packageScripts;
if (shell.test("-f", packageName)
    && (packageScripts = JSON.parse(shell.head({ "-n": 100000 }, packageName)).scripts)) {
      // if a package specifies scripts.vlm it must be stored inside bin/vlm to prevent inf-loop
  if ((shouldForward || (process.argv[1].indexOf("bin/vlm") === -1))
      && packageScripts.vlm) {
    forwardToValma("");
  }
  commandPools.push({ name: "package", poolPath: "package.json:scripts.", source: packageScripts });
}

if (shell.test("-d", dependedPoolPath)) {
  const dependedScripts = shell.ls("-lAR", dependedPoolPath);
  if ((shouldForward || (process.argv[1].indexOf(process.cwd()) !== 0))
      && dependedScripts.find(dependedFile => dependedFile.name === "vlm")) {
    forwardToValma(dependedPoolPath);
  }
  commandPools.push({ name: "depended", poolPath: dependedPoolPath, source: dependedScripts });
}

const globalValmaPath = !process.env.VALMA_LOCAL
    && (process.env.VALMA_GLOBAL || shell.which("vlm"));
if (globalValmaPath) {
  globalPoolPath = globalValmaPath.match(/(.*(\/|\\))vlm/)[1];
  const globalScripts = shell.ls("-lAR", globalPoolPath);
  if (shouldForward && globalScripts.find(globalFile => globalFile.name === "vlm")) {
    forwardToValma(globalPoolPath);
  }
  commandPools.push({ name: "global", poolPath: globalPoolPath, source: globalScripts });
}

if (!fullyBuiltin && shouldForward) {
  console.error("vlm: could not locate 'vlm' in any pool while trying to load node environment");
  process.exit(-1);
}

// Phase 2: parse argv and extract the commands from the pools which match the requested command

const minimatch = require("minimatch");

// eslint-disable-next-line no-bitwise
function isDirectory (candidate) { return candidate.mode & 0x4000; }

const yargsIntermediate = createCommonYargs()

const yargv = yargsIntermediate.argv;

const command = yargv._[0];
const commandGlob = `valma-${command || "*"}`;

// Have matching global command names execute first (while obeying overrides properly ofc.)
commandPools.reverse();

for (var pool of commandPools) {
  pool.commands = {};
  if (!Array.isArray(pool.source)) {
    for (var key of Object.keys(pool.source)) {
      if (minimatch(key, commandGlob)) {
        pool.commands[key.slice(6)] = pool.source[key];
      }
    }
  } else {
    pool.source.forEach(script => {
      if (minimatch(script.name, commandGlob) && !isDirectory(script)) {
        pool.commands[script.name.slice(6)] = { script, pool };
      }
    });
  }
}

if (!command || yargv.list) {
  if (!yargv.list) console.log("Usage: vlm [-l] <command> [<args>]\n");
  var align = 0;
  for (var p of commandPools) {
    Object.keys(p.commands).forEach(name => { if (name.length > align) align = name.length; });
  }
  for (var listPool of commandPools) {
    if (!Object.keys(listPool.commands).length) {
      console.log(`\t'${listPool.name}' pool empty (with "${listPool.poolPath}${commandGlob}")`);
    } else {
      console.log(`\t'${listPool.name}' pool commands (with "${
          listPool.poolPath}${commandGlob}"):`);
      Object.keys(listPool.commands).forEach(commandName => {
        const cmd = listPool.commands[commandName];
        console.log(commandName, `${" ".repeat(align - commandName.length)}:`,
            `${typeof cmd === "string" ? cmd : `${listPool.poolPath}valma-${commandName}`}`);
      });
      console.log();
    }
  }
  process.exit(0);
}

const activeCommands = Object.assign({}, ...commandPools.map(p => p.commands));

if (!Object.keys(activeCommands).length) {
  if (command.indexOf("*") !== -1) process.exit(0);
  console.log(`vlm: cannot find command '${command}' from pools:`,
      ...commandPools.map(emptyPool => `"${path.join(emptyPool.poolPath, commandGlob)}"`));
  process.exit(-1);
}

const commandArgs = process.argv.slice(3).map(arg => JSON.stringify(arg)).join(" ");

var ret;

for (var executeePool of commandPools) {
  for (var executeeName of Object.keys(executeePool.commands)) {
    var commandContent = activeCommands[executeeName];
    if (!commandContent) continue;
    var dispatch;
    if (typeof commandContent === "string") {
      dispatch = `${commandContent} ${commandArgs}`;
    } else {
      dispatch = `${commandContent.pool.poolPath}valma-${executeeName} ${commandArgs}`;
    }
    // console.log(`Executing command '${dispatch}'`);
    ret = shell.exec(dispatch);
    delete activeCommands[executeeName];
  }
}

process.exit(ret.code);
