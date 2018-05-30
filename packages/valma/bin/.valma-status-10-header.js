exports.command = ".status-10-header";
exports.summary = "Display the generic information header for the current repository";
exports.describe = `${exports.summary}.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => {
  const config = yargv.vlm.packageConfig;
  const valaa = config && config.valaa;
  if (valaa) {
    console.log(`${valaa.domain} ${valaa.type} ${config.name}@${config.version}`);
  } else {
    console.log(`package '${config && config.name
        }' is not a valaa repository (package.json doesn't contain a .valaa section)`);
  }
};
