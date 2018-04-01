module.exports = {
  ValaaPendingBlobsBucket: require("./s3/ValaaPendingBlobsBucket"),
  ValaaLiveBlobsBucket: require("./s3/ValaaLiveBlobsBucket"),
  ValaaBlobsAccessPublicRole: require("./IAM/ValaaBlobsAccessPublicRole"),
  ValaaBlobsAccessPublicIdentityPool: require("./cognito/ValaaBlobsAccessPublicIdentityPool"),
  ValaaBlobsAccessPublicIdentityPoolRoleAttachment: require("./cognito/ValaaBlobsAccessPublicIdentityPoolRoleAttachment"),
  ValaaBlobVerifyApi: require("./serverless/ValaaBlobVerifyApi"),
  ValaaBlobVerify: require("./serverless/ValaaBlobVerify")
};
