require("shelljs/global");
const path = require("path");
const fs = require("fs");

function help () {
  console.log("Provide 3 arguments: azureSubscriptionId groupName azureRegionName azureParametersFile");
}

function main () {
  if (process.argv.length < 6) {
    console.error("Not enough arguments.");
    help();
    process.exit(1);
  }
  const templatePath = path.join(__dirname, "..", "production-templates","valaa-stack.json");
  const subscription = process.argv[2];
  const groupName = process.argv[3];
  const regionName = process.argv[4];
  const paramFile = path.join(__dirname, "..", process.argv[5]);
  exec(`azure account set ${subscription} true`);
  exec(`azure config mode arm`);
  exec(`azure group create ${groupName} ${regionName}`);
  exec(`azure group deployment create --template-file ${templatePath} ${groupName} -e "${paramFile}"`);
}

if (require.main === module) {
  main();
}
