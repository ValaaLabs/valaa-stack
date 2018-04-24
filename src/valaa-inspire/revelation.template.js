// @flow

import { arrayOf, dictionaryOf } from "~/valaa-inspire/Revelation";

export default {
  clientName: "Inspire Application Gateway",
  verbosity: 0,

  directPartitionURI: "",

  schemePlugins: arrayOf(schemePlugins()),
  globalDecoders: [], // arrayOf(decoders()) doesn't play nice with full blown class instances yet.

  oracle: { logLevel: 0 },
  reducer: { logLevel: 0 },
  corpus: { logLevel: 0 },
  falseProphet: { logLevel: 0 },

  authorityConfigs: dictionaryOf(authorityConfigs()),
  partitions: dictionaryOf(partitionInfos()),
  blobs: dictionaryOf(blobInfos()),
  buffers: dictionaryOf(bufferDatas()),
};

function plugin () {
  return {
    schemes: dictionaryOf(scheme()),
    decoders: dictionaryOf(decoder()),
  };
}

function scheme () {
  return {
    getURIScheme () {},
    getAuthorityURIFromPartitionURI () {},
    getInteractableURLFromAuthorityURI () {},
    createDefaultAuthorityConfig () {},
    createAuthorityProphet () {},
  };
}

function decoder () {
  return {
    mediaTypes: arrayOf({ type: "", subtype: "" }),
    decode () {},
  };
}
function authorityConfigs () {
  return {
    type: "",
    name: "",
    partitionAuthorityURI: "",
    credentials: { accessKeyId: "", secretAccessKey: "", region: "", IdentityPoolId: "" },
    api: { endpoint: "", verifyEndpoint: "" },
    iot: { endpoint: "" },
    s3: { pendingBucketName: "", liveBucketName: "" },
    repositoryIndexId: false,
    noconnect: null,
    test: null,
  };
}

function partitionInfos () {
  return {
    name: "",
    commandId: NaN,
    eventId: NaN,
    logs: {
      commands: arrayOf(actions()),
      events: arrayOf(actions()),
      medias: dictionaryOf({
        mediaId: "",
        mediaInfo: {
          name: "",
          blobId: "",
        },
        isPersisted: null,
        isInMemory: null,
      }),
    },
  };
}

function actions () {
  return {
    type: "",
    version: "",
    commandId: "",
    timeStamp: NaN,
    partitions: dictionaryOf({
      eventId: NaN,
      partitionAuthorityURI: "",
    }),
    /*
    typeName: "",
    id: [],
    actions: [],
    initialState: {},
    */
  };
}

function blobInfos () {
  return {
    byteLength: NaN,
    persistRefCount: NaN,
  };
}

function bufferDatas () {
  return {
    base64: "",
  };
}
