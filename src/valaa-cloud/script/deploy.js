//import glob from "glob-fs";
//import exec from "shelljs";

const exec = require("shelljs").exec;
const glob = require("glob-fs")();
const fs = require('fs');
const path = require("path");
const configuration = require("../src/Build-Configuration").Configuration();

const DIST_PATH = path.join(__dirname, "..", "dist");
const COMPILED_TEMPLATE_FILE = path.join(DIST_PATH, "compiled-template.json");
const OUTPUT_TEMPLATE_FILE = path.join(DIST_PATH, "output.json");
const CLOUDFORMATION_CONFIG_BUCKET = configuration.cloudformationConfigBucket;

const STACK_NAME = configuration.stackName;

console.log("Using environment:",configuration.environmentKey);
console.log("Building stack:",STACK_NAME);

// we start by performing a build, just to be sure
exec("npm run build");

fs.writeFileSync(COMPILED_TEMPLATE_FILE,
  JSON.stringify(
    require(path.join("..", "cloudformation", "index.js"))
  )
);

console.log("Now run following commands:");
console.log(`aws cloudformation package \
 --template-file ${COMPILED_TEMPLATE_FILE} \
 --output-template-file ${OUTPUT_TEMPLATE_FILE} \
 --use-json\
 --s3-bucket ${CLOUDFORMATION_CONFIG_BUCKET}`);
console.log(`aws cloudformation deploy \
 --template-file ${OUTPUT_TEMPLATE_FILE} \
 --stack-name ${STACK_NAME} \
 --capabilities CAPABILITY_IAM`);

/*
exec(`aws cloudformation package \
 --template-file ${COMPILED_TEMPLATE_FILE} \
 --output-template-file ${OUTPUT_TEMPLATE_FILE} \
 --use-json\
 --s3-bucket ${CLOUDFORMATION_CONFIG_BUCKET}`);
exec(`aws cloudformation deploy \
 --template-file ${OUTPUT_TEMPLATE_FILE} \
 --stack-name ${STACK_NAME} \
 --capabilities CAPABILITY_IAM`);
*/