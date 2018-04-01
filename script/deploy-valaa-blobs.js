const exec = require("shelljs").exec;
const path = require("path");
const fs = require("fs-extra");

const DIST_PATH = path.join(__dirname, "..", "dist", "cloudformation");
const SRC_PATH = path.join(__dirname, "..", "src", "valaa-blob-storage");
if (fs.pathExistsSync(DIST_PATH)) fs.removeSync(DIST_PATH);
fs.mkdirpSync(DIST_PATH);

exec(`webpack -p --config ${path.join(SRC_PATH, "webpack.config.js")}`);
fs.copySync(path.join(SRC_PATH, "node_modules"), path.join(DIST_PATH, "node_modules"));

const cloudFormationTemplate = require("../src/valaa-blob-storage/cloudformation");
const COMPILED_TEMPLATE_FILE = path.join(DIST_PATH, "compiled-template.json");

fs.writeFileSync(COMPILED_TEMPLATE_FILE, JSON.stringify(cloudFormationTemplate));

const OUTPUT_TEMPLATE_FILE = path.join(DIST_PATH, "output.json");

// TODO: grab these from the environment
const STACK_NAME = "test-valaa-blob-stack";
const CLOUDFORMATION_CONFIG_BUCKET = "cf-templates-1qa0ntd663k72-eu-west-1";

exec(`aws cloudformation package \
        --template-file ${COMPILED_TEMPLATE_FILE} \
        --output-template-file ${OUTPUT_TEMPLATE_FILE} \
        --use-json\
        --s3-bucket ${CLOUDFORMATION_CONFIG_BUCKET}`);
exec(`aws cloudformation deploy \
        --template-file ${OUTPUT_TEMPLATE_FILE} \
        --stack-name ${STACK_NAME} \
        --capabilities CAPABILITY_IAM`);
