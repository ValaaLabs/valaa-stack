#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const commandPaths = ["script", "bin", "node_modules/.bin"];
const commandPathNames = ["local", "distributed", "depended"];

for (var newerValmaCandidateBasePath of commandPaths) {
  var valmaPathCandidate = path.join(process.cwd(), newerValmaCandidateBasePath, "valma.js");
  if (process.argv[1] === valmaPathCandidate) break;
  if (!shell.test("-f", valmaPathCandidate)) continue;
  valmaPathCandidate = path.join(process.cwd(), newerValmaCandidateBasePath, "valma");
  if (process.argv[1] === valmaPathCandidate) break;
  if (!shell.test("-f", valmaPathCandidate)) continue;

  const forwardArgs = process.argv.slice(2).map(arg => JSON.stringify(arg)).join(" ");
  // console.log(`Forwarding to: npm run node-dispatch -- ${valmaPathCandidate} ${forwardArgs}`);
  shell.exec(`npx -c ${valmaPathCandidate} -- ${forwardArgs}`);
  process.exit();
}

// Only add these here after valma.js forwarding to avoid forwarding to global valma.js
const globalValmaPath = shell.which("valma");
var globalPath;
if (globalValmaPath) {
  globalPath = globalValmaPath.match(/(.*)(\/|\\)valma(.js)?/)[1];
  commandPaths.push(globalPath);
  commandPathNames.push("global");
}

const command = process.argv[2];

const oldSilent = shell.config.silent;
shell.config.silent = true;
const commandLists = commandPaths.map(commandPath =>
  [].concat(shell.ls(`${path.join(commandPath, "valma-")}${command || "*"}?(.js)`)));
shell.config.silent = oldSilent;

if (!command) {
  console.log("Usage: vlm <command> [<args>]\n");
  for (var index in commandLists) {
    if (!commandLists[index].length) {
      console.log(`\n\tNo '${commandPathNames[index]}' commands (as "${
          path.join(commandPaths[index], "valma-")}<command>?(.js)")`);
    } else {
      console.log(
          `\n\t'${commandPathNames[index]}' commands (as "${
              path.join(commandPaths[index], "valma-")}<command>?(.js)"):`,
          commandLists[index].map(commandPath =>
              `\n${commandPath.slice(`${commandPaths[index]}/valma-`.length).replace(".js", "")}`)
          .join(""));
    }
  }
  process.exit();
}

const forwardPath = [].concat(...commandLists)[0];
if (!forwardPath) {
  console.log(`valma: cannot find command script '${command}' from paths:`,
  ...commandPaths.map(attemptedPath => `"${path.join(attemptedPath, "valma")}-${command}"`));
  process.exit(-1);
}

const commandArgs = process.argv.slice(3).map(arg => JSON.stringify(arg)).join(" ");
const dispatcher = (globalPath && (forwardPath.slice(0, globalPath.length) === globalPath))
        || !shell.test("-d", "node_modules")
    ? `${forwardPath} ${commandArgs}`
    : `npx -c ${forwardPath} -- ${commandArgs}`;

// console.log(`Executing command '${command}': node ${forwardPath} ${commandArgs}`);

const ret = shell.exec(dispatcher);
process.exit(ret.code);
