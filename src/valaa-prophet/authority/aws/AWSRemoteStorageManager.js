// @flow

import { v4 as uuid } from "uuid";
import S3 from "aws-sdk/clients/s3";

import type { MediaInfo } from "~/valaa-prophet/api/Prophet";
import request from "~/valaa-tools/request";

/**
 * This class is repsonsible for uploads and downloads to the Valaa blob storage backend. It keeps
 * track of local uploads and can let other parts of the system know when an upload is in progress
 * for a given blob.
 */
export default class AWSRemoteStorageManager {
  _config: Object;
  _s3Pending: S3;
  _s3Live: S3;
  _pendingUploads: Object;

  constructor (config: Object) {
    this._config = config;
    this._s3Pending = new S3({
      apiVersion: "2006-03-01",
      params: { Bucket: this._config.s3.pendingBucketName }
    });
    this._s3Live = new S3({
      apiVersion: "2006-03-01",
      params: { Bucket: this._config.s3.liveBucketName }
    });

    this._pendingUploads = {};
  }

  /**
   * Download a blob from the cloud
   * @param {string} contentId the id for the remote blob to download
   */
  readBlobContentAsMedia (mediaInfo: MediaInfo): any {
    const options = {
      Bucket: this._config.s3.liveBucketName,
      Key: mediaInfo.blobId,
    };
    if (mediaInfo.type && mediaInfo.subtype) {
      options.ResponseContentType = `${mediaInfo.type}/${mediaInfo.subtype}`;
    }
    return new Promise((resolve, reject) => {
      const awsReq = this._s3Live.getObject(options).promise();
      awsReq.then(awsRes => resolve(awsRes.Body.toString()), reject);
    });
  }

  getBlobURLAsMediaURL (mediaInfo: MediaInfo) {
    const options = {
      Bucket: this._config.s3.liveBucketName,
      Key: mediaInfo.blobId,
    };
    if (mediaInfo.type && mediaInfo.subtype) {
      options.ResponseContentType = `${mediaInfo.type}/${mediaInfo.subtype}`;
    }
    return new Promise((resolve, reject) => {
      this._s3Live.getSignedUrl("getObject", options, (err, url) => {
        if (err) return reject(err);
        return resolve(url);
      });
    });
  }

  /**
   * Store a blob in the cloud backend.
   * Locally calculates the blob's content hash and then initiates an upload. This function does not
   * await the upload to complete, but the verifyContent function can be used to wait for an upload.
   * The upload stores a promise in the pendingUploads property that will resolve once the upload
   * has completed and been verified by the backend. This promise can be awaited by clientside code
   * that need to wait for the upload to be completed.
   * The promise is stored against the mediaInfo.blobId.
   * @param {string} content The blob content
   */
  storeMediaBlobContent (content: ArrayBuffer, mediaInfo: MediaInfo) {
    const candidateContentId = mediaInfo.blobId;
    if (this._pendingUploads[candidateContentId]) {
      console.warn(`Upload already in progress for cancidate blobId ${
          candidateContentId} (of Media '${mediaInfo.name}'), ignoring upload request.`);
    } else {
      this._pendingUploads[candidateContentId] = new Promise(async (resolve, reject) => {
        const uploadId = uuid();
        await this._s3Pending.upload({ Key: uploadId, Body: content }).promise();
        const { contentId: verifiedContentId } = await request({
          method: "get",
          url: `${this._config.api.verifyEndpoint}?pendingObjectName=${uploadId}`,
        });

        delete this._pendingUploads[candidateContentId];

        if (verifiedContentId !== candidateContentId) {
          reject(Error(`ContentId mismatch for upload ${uploadId} (of Media '${mediaInfo.name}'):
              server calulated ${verifiedContentId} but client expected ${candidateContentId}`));
        }
        resolve(verifiedContentId);
      });
    }
    return this._pendingUploads[candidateContentId];
  }

  /**
   * Used to verify that blob content exists in the backend. It doesnt actually check the backend,
   * only for any pending local upload.
   * Awaits an upload promise for the given contentId if it exists, otherwise returns instantly.
   * @param {string} contentId The content to verify
   */
  verifyContent (contentId: string) {
    return this._pendingUploads[contentId];
  }

}
