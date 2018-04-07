// @flow

export const schemePlugin = {
  getURIScheme: () => "valaa-local",

  getAuthorityURIFromPartitionURI: () => `valaa-local:`,

  getInteractableURLFromAuthorityURI: () => null,

  createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

  createAuthorityProphet: () => null,
};
