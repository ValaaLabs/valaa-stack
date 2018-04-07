// @flow

export const schemePlugin = {
  getURIScheme: () => "valaa-test",

  getAuthorityURIFromPartitionURI: () => `valaa-test:`,

  getInteractableURLFromAuthorityURI: () => null,

  createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

  createAuthorityProphet: () => null,
};
