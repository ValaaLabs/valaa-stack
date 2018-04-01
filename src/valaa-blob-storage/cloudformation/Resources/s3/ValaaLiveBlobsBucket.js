module.exports = {
  Type: "AWS::S3::Bucket",
  Properties: {
    AccessControl: "Private",
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
