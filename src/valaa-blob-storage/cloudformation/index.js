module.exports = {
  AWSTemplateFormatVersion: "2010-09-09",
  Transform: "AWS::Serverless-2016-10-31",
  Description: "Valaa blob storage and verification system",
  Resources: require("./Resources"),
  Outputs: require("./Outputs")
};
