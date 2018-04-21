// @flow

export default {
  getURIScheme: () => "valaa-local",

  getAuthorityURIFromPartitionURI: () => `valaa-local:`,

  getInteractableURLFromAuthorityURI: () => null,

  createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

  createAuthorityProphet: () => null,
};
