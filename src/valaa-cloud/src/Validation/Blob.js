import AWS from "aws-sdk";

export default class BlobValidator {

  constructor (s3) {
    AWS.config.update({ region: "eu-west-1" });
    this.s3 = s3 || new AWS.S3({ apiVersion: "2006-03-01" });
  }

  async validate (commandEnvelope: Object) {
    // if this validator doesn't apply we pretend validity
    if (!shouldValidate(commandEnvelope)) {
      return true;
    }

    try {
      await this.s3.headObject(
        { Bucket: process.env.LIVE_BUCKET, Key: commandEnvelope.command.id }
      ).promise();
    } catch (error) {
      console.log(`Error, most likely file not in bucket, or configuration for bucket wrong: ${error}`);
      throw new Error("object not in bucket");
    }

    return true;
  }
}


function shouldValidate (commandEnvelope:Object) {
  return (commandEnvelope.command.type === "CREATED" || commandEnvelope.command.type === "MODIFIED")
  && commandEnvelope.command.typeName === "Blob";
}
