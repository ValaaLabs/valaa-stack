module.exports = {
  Type: "AWS::Serverless::Api",
  Properties: {
    StageName: "develop",
    DefinitionBody: require("./swagger.json")
  }
};
