// These are the credentials for the temporary AWS IAM user "iot-test"
// todo WARNING! HARDCODED CREDENTIALS! Access has to be revoked after testing!
export default {
  type: "AWS",
  name: "Valaa development AWS authority",
  api: {
    verifyEndpoint: "https://2xks1petn0.execute-api.eu-west-1.amazonaws.com/develop/verify-blob",
  },
  s3: {
    pendingBucketName: "test-valaa-blob-stack-valaapendingblobsbucket-d422c83zfsq7",
    liveBucketName: "test-valaa-blob-stack-valaaliveblobsbucket-hb2tl893ajx1",
  },
  noconnect: false,
  test: true
};
