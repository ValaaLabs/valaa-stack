module.exports = {
  ContentVerificationURL: {
    Description: "Content verification URL for the prod environment",
    // eslint-disable-next-line
    Value: { "Fn::Sub": "https://${ValaaBlobVerifyApi}.execute-api.${AWS::Region}.amazonaws.com/develop/verify-blob" }
  }
};
