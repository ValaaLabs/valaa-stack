module.exports = {
  Type: "AWS::Serverless::Function",
  Properties: {
    Environment: {
      Variables: {
        PENDING_BUCKET: { "Fn::Select": [0, { "Fn::Split": [".", { "Fn::GetAtt": "ValaaPendingBlobsBucket.DomainName" }] }] },
        LIVE_BUCKET: { "Fn::Select": [0, { "Fn::Split": [".", { "Fn::GetAtt": "ValaaLiveBlobsBucket.DomainName" }] }] }
      }
    },
    Handler: "lambda/verify-blob.handler",
    Runtime: "nodejs6.10",
    CodeUri: ".",
    Description: "Valaa blob content verification function",
    MemorySize: 256,
    Timeout: 300,
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
              "s3:ListBucket"
            ],
            Resource: [
              { "Fn::GetAtt": "ValaaLiveBlobsBucket.Arn" },
              { "Fn::Join": ["", [{ "Fn::GetAtt": "ValaaLiveBlobsBucket.Arn" }, "/*"]] }
            ]
          }
        ]
      },
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "s3:GetObject",
              "s3:GetObjectAcl",
              "s3:ListBucket"
            ],
            Resource: [
              { "Fn::GetAtt": "ValaaPendingBlobsBucket.Arn" },
              { "Fn::Join": ["", [{ "Fn::GetAtt": "ValaaPendingBlobsBucket.Arn" }, "/*"]] }
            ]
          }
        ]
      }
    ],
    Events: {
      Http: {
        Type: "Api",
        Properties: {
          Path: "/verify-blob",
          Method: "GET",
          RestApiId: { Ref: "ValaaBlobVerifyApi" }
        }
      }
    }
  }
};
