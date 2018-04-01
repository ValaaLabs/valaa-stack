module.exports = {
  Type: "AWS::Cognito::IdentityPoolRoleAttachment",
  Properties: {
    IdentityPoolId: { Ref: "ValaaBlobsAccessPublicIdentityPool" },
    Roles: {
      authenticated: { "Fn::GetAtt": "ValaaBlobsAccessPublicRole.Arn" },
      unauthenticated: { "Fn::GetAtt": "ValaaBlobsAccessPublicRole.Arn" }
    }
  }
};
