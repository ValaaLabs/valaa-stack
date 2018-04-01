// import Configuration from "../src/Configuration";

/* eslint-disable guard-for-in, func-names */
// const dbtable = "arn:aws:dynamodb:eu-west-1:452534978870:table/dummy-table";
// const dbtable = "arn:aws:dynamodb:eu-west-1:452534978870:table/valaa-cloud-livetest";

module.exports = function (configuration) {
  const dbtable = configuration.database;
  const resources = {};
  const lambdaMaps = require("../lambda-maps.json");

  for (const [key, value] of entries(lambdaMaps)) {
    resources[key] = {
      Type: "AWS::Serverless::Function",
      Properties: {
        Environment: {
          Variables: {
            LIVE_BUCKET: "test-valaa-blob-stack-valaaliveblobsbucket-hb2tl893ajx1",
            NODE_ENV: configuration.environmentKey
          }
        },
        Policies: [
          {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: [
                  "s3:GetObject",
                  "s3:GetObjectAcl",
                  "s3:PutObject",
                  "s3:PutObjectAcl",
                  "s3:ListBucket",
                  "dynamodb:*", // TODO(Matt) more fine grained permissions
                  "iot:Publish"
                ],
                Resource: [
                  "arn:aws:s3:::test-valaa-blob-stack-valaaliveblobsbucket-hb2tl893ajx1",
                  "arn:aws:s3:::test-valaa-blob-stack-valaaliveblobsbucket-hb2tl893ajx1/*",
                  dbtable,
                  dbtable + "/stream/*", // eslint-disable-line prefer-template
                  "arn:aws:iot:eu-west-1:452534978870:*"
                ]
              }
            ]
          },
        ],
        Handler: `${value.function_name}.handler`,
        Runtime: "nodejs6.10",
        CodeUri: ".",
        Description: "see lambda-maps",
        MemorySize: value.memory_size,
        Timeout: value.timeout,
        Events: {}
      }
    };
    for (const method of value.methods) {
      resources[key].Properties.Events[method] = {
        Type: "Api",
        Properties: {
          Path: `/${value.function_name}`,
          Method: method,
          RestApiId: { Ref: "TestApi" }
        }
      };
    }
  }
  resources.TestApi = {
    Type: "AWS::Serverless::Api",
    Properties: {
      StageName: "developtest",
      DefinitionBody: require("../swagger.json")
    }
  };

  return resources;
};

function* entries (obj) {
  for (const key of Object.keys(obj)) {
    yield [key, obj[key]];
  }
}
