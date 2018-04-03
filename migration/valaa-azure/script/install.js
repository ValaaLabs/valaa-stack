require("shelljs/global");
const path = require("path");
const fs = require("fs");
const sshExec = require('ssh-exec')

function help () {
  console.log("Provide 2 arguments: hostName, deployKeyDir");
}

function remoteExec(cmd, host) {
  console.log(`${host}:${cmd}`);
  sshExec(cmd, host).pipe(process.stdout);
}

function main (hostname, deployKeyDir) {
  const virtualhostPath = path.join(__dirname, "..", "production-config", "valaa-apache2.conf");
  const deployKeyPath = path.normalize(deployKeyDir);
  const hostAndUser = `valaa-user@${hostname}`;
  exec(`scp ${virtualhostPath} ${hostAndUser}:/home/valaa-user/000-default.conf`);
  // TODO: azure must have a better way to manage ssh keys
  exec(`scp ${path.join(deployKeyPath, "id_rsa")} ${hostAndUser}:/home/valaa-user/.ssh/id_rsa`);
  exec(`scp ${path.join(deployKeyPath, "id_rsa.pub")} ${hostAndUser}:/home/valaa-user/.ssh/id_rsa.pub`);
  exec(`scp ${path.join(__dirname, "install.sh")} ${hostAndUser}:/home/valaa-user/install.sh`);
  remoteExec("sh install.sh", hostAndUser);
}

if (require.main === module) {
  if (process.argv.length < 4) {
    console.error("Not enough arguments.");
    help();
    process.exit(1);
  }
  main(process.argv[2], process.argv[3]);
}
