require("shelljs/global");

var synopsis = "devServer distDirectory";

if (!process.argv[2]) {
  console.log("Synopsis:", synopsis);
  exit(0);
}

var projectDirectory = process.argv[2];

mkdir("-p", projectDirectory);
cp("-R", "revelations/*", projectDirectory);
exec("npm run dev-webpack " + projectDirectory);
