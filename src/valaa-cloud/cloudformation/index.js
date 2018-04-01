const Configuration = require("../src/Build-Configuration").Configuration;

module.exports = {
  AWSTemplateFormatVersion: "2010-09-09",
  Transform: "AWS::Serverless-2016-10-31",
  Description: "valaa-cloud backend",
  Resources: require("./Resources")(Configuration()),
  Outputs: require("./Outputs")
};
