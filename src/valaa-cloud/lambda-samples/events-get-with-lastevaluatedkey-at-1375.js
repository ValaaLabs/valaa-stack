// old style, as this can't go through webpack
module.exports = {
  resource: "/events",
  path: "/events",
  httpMethod: "GET",
  headers: {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "de-DE,de;q=0.8,en-US;q=0.6,en;q=0.4",
    "CloudFront-Forwarded-Proto": "https",
    "CloudFront-Is-Desktop-Viewer": "true",
    "CloudFront-Is-Mobile-Viewer": "false",
    "CloudFront-Is-SmartTV-Viewer": "false",
    "CloudFront-Is-Tablet-Viewer": "false",
    "CloudFront-Viewer-Country": "DE",
    Host: "tbdmbuzdg5.execute-api.eu-west-1.amazonaws.com",
    "upgrade-insecure-requests": "1",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.86 Safari/537.36",
    Via: "2.0 f7cf1cf41b6eacdcf79cd9a0aa1d0179.cloudfront.net (CloudFront)",
    "X-Amz-Cf-Id": "eMKbD3lIdpyW3MUxihYn-HSSDszN0nnyzytovR11T_z_KtqgfSuLGw==",
    "X-Amzn-Trace-Id": "Root=1-594136c2-21cb9973428491bd4b7e89c7",
    "X-Forwarded-For": "92.203.29.216, 216.137.60.42",
    "X-Forwarded-Port": "443",
    "X-Forwarded-Proto": "https"
  },
  queryStringParameters: {
    partitionId: "dummy-11-7223-4cf8-923f-93ab87c45d01",
    lastEvaluatedKey: 1375,
    precedingEvent: 1700,
    lastEvent: 1710
  },
  pathParameters: null,
  stageVariables: null,
  requestContext: {
    path: "/develop/events",
    accountId: "452534978870",
    resourceId: "1u4oqu",
    stage: "develop",
    requestId: "6da1ee7a-5103-11e7-b9b8-4b8c9d4a2ddb",
    identity: {
      cognitoIdentityPoolId: null,
      accountId: null,
      cognitoIdentityId: null,
      caller: null,
      apiKey: "",
      sourceIp: "92.203.29.216",
      accessKey: null,
      cognitoAuthenticationType: null,
      cognitoAuthenticationProvider: null,
      userArn: null,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.86 Safari/537.36",
      user: null
    },
    resourcePath: "/events",
    httpMethod: "GET",
    apiId: "tbdmbuzdg5"
  },
  body: null,
  isBase64Encoded: false
};
