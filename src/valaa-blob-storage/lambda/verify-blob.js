// @flow
import type Stream from "stream";

import AWS from "aws-sdk";
import { contentIdFromNativeStream } from "~/valaa-tools";

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const ERRORS = {
  UNSUPPORTED_METHOD: (method: string) => `Unsupported method "${method}"`,
  INVALID_PARAMS: () => `You must provide the "pendingObjectName" parameter`,
};

function formatError (err: Object): string {
  return JSON.stringify({
    code: err.code,
    message: err.message
  });
}

function getObjectStream (bucket: string, key: string): Promise {
  const params = { Bucket: bucket, Key: key };
  return new Promise((resolve, reject) => {
    // headObject can be used to check if the object exists without returning its data.
    // AWSRequest.createReadStream dies horribly if you try it on a getObject request for an object
    // that doesnt exist.
    s3.headObject(params, err => {
      if (err) {
        reject(err);
      } else {
        resolve(s3.getObject(params).createReadStream());
      }
    });
  });
}

function copyPendingToLive (pendingId: string, liveId: string): Promise {
  return s3.copyObject({
    Bucket: process.env.LIVE_BUCKET,
    CopySource: `/${process.env.PENDING_BUCKET}/${pendingId}`,
    Key: liveId,
  }).promise();
}

exports.handler = async (event, context, callback) => {
  const done: Function = (err: Object, res: Object, errorStatus: ?number = 500) => {
    if (err) console.log(err);
    return callback(null, {
      statusCode: err ? errorStatus : 200,
      body: err ? formatError(err) : JSON.stringify(res),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
        "Access-Control-Allow-Origin": "*"
      },
    });
  };

  if (event.httpMethod !== "GET") {
    done(new Error(ERRORS.UNSUPPORTED_METHOD(event.httpMethod)), null, 400);
    return;
  }

  if (!event.queryStringParameters || !event.queryStringParameters.pendingObjectName) {
    done(new Error(ERRORS.INVALID_PARAMS()), null, 400);
    return;
  }

  const pendingId: string = event.queryStringParameters.pendingObjectName;
  try {
    const pendingContentStream: Stream = await getObjectStream(
        process.env.PENDING_BUCKET, pendingId);
    const contentId: string = await contentIdFromNativeStream(pendingContentStream);

    s3.headObject({ Bucket: process.env.LIVE_BUCKET, Key: contentId }, err => {
      // If there is no live content with this content id, set the pending object to live and
      // return the new content id
      if (err && err.code === "NotFound") {
        copyPendingToLive(pendingId, contentId).then(
          () => done(null, { contentId }),
          e => done(e)
        );

      // If there is an error for any other reason it is unxepected
      } else if (err) {
        done(err);

      // If there is an object with this content id then return the id without copying
      } else {
        done(null, { contentId });
      }
    });
  } catch (error) {
    done(error, null, error.code === "NotFound" ? 404 : 500);
  }
};
