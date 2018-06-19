exports.command = ".configure/.type/library";
exports.summary = "Configure a Valaa library repository";
exports.describe = `${exports.summary}.

Libraries are repositories which contain arbitrary ES5 source code and
expose an API via package.json .main stanza.

While a library can provide valma commands it is not a toolset. Thus it
can't have repository specific configurations or release builds.
Create or configure a toolset for building releases from libraries.`;

exports.builder = (yargs) => yargs;

exports.handler = (yargv) => yargv.vlm.invoke(`.configure/.type/.library/**/*`);
