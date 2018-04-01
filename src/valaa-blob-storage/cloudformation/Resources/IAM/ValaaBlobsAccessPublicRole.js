module.exports = {
  Type: "AWS::IAM::Role",
  Properties: {
    AssumeRolePolicyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Federated: "cognito-identity.amazonaws.com"
          },
          Action: "sts:AssumeRoleWithWebIdentity",
        }
      ]
    },
    Policies: [
      {
        PolicyName: "LiveBlobAccess",
        PolicyDocument: {
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
                { "Fn::GetAtt": "ValaaLiveBlobsBucket.Arn" },
                { "Fn::Join": ["", [{ "Fn::GetAtt": "ValaaLiveBlobsBucket.Arn" }, "/*"]] }
              ]
            }
          ]
        }
      },
      {
        PolicyName: "PendingBlobAccess",
        PolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: [
                "s3:PutObject",
                "s3:PutObjectAcl"
              ],
              Resource: [
                { "Fn::Join": ["", [{ "Fn::GetAtt": "ValaaPendingBlobsBucket.Arn" }, "/*"]] }
              ]
            }
          ]
        }
      },
      {
        PolicyName: "CognitoAccess",
        PolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: [
                "mobileanalytics:PutEvents",
                "cognito-sync:*"
              ],
              Resource: [
                "*"
              ]
            }
          ]
        }
      }
    ]
  }
};
