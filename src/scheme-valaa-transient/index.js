// @flow

export const schemePlugin = {
  getURIScheme: () => "valaa-transient",

  getAuthorityURIFromPartitionURI: () => `valaa-transient:`,

  getInteractableURLFromAuthorityURI: () => null,

  createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

  createAuthorityProphet: () => null,
};
