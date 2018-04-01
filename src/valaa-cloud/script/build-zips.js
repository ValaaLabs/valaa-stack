const exec = require("shelljs").exec;
const glob = require("glob-fs")();
const path = require("path");

glob.readdirStream("dist/*.js").on("data", (file) => {
  const zipName = path.join("dist", `${file.name}.zip`);
  const baseName = path.join("dist", file.basename);
  exec(`zip -r -j ${zipName} ${baseName}`);
});
