// @flow

export default {
  getURIScheme: () => "valaa-transient",

  getAuthorityURIFromPartitionURI: () => `valaa-transient:`,

  getInteractableURLFromAuthorityURI: () => null,

  createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

  createAuthorityProphet: () => null,
};
