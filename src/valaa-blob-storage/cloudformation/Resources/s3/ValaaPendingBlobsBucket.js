module.exports = {
  Type: "AWS::S3::Bucket",
  Properties: {
    AccessControl: "Private",
    LifecycleConfiguration: {
      Rules: [
        {
          ExpirationInDays: 1,
          Status: "Enabled"
        }
      ]
    },
    CorsConfiguration: {
      CorsRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "POST", "PUT", "DELETE"],
          AllowedHeaders: ["*"]
        }
      ]
    }
  }
};
