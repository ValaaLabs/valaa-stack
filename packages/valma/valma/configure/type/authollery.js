exports.command = ".configure/.type/authollery";
exports.summary = "Configure a Valaa authollery repository";
exports.describe = `${exports.summary}.
Autholleries (ie. AUTHority contrOLLEr repositoRIES) are used to
configure, deploy, update, monitor and diagnose live infrastructure
resources relating to a particular Valaa authority.

Installs a devDependency to @valos/toolset-authollery.
`;

exports.builder = (yargs) => yargs;

exports.handler = async (yargv) => {
  const vlm = yargv.vlm;
  if (!((vlm.packageConfig || {}).devDependencies || {})["@valos/toolset-authollery"]) {
    await vlm.executeScript("yarn", ["add", "-W", "--dev", "@valos/toolset-authollery"]);
  }
  return vlm.callValma(`.configure/.type/.authollery/**/*`);
};
