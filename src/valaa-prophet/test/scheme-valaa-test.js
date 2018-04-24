// @flow

export default function createValaaTestScheme (/* { logger } */) {
  return {
    getURIScheme: () => "valaa-test",

    getAuthorityURIFromPartitionURI: () => `valaa-test:`,

    getInteractableURLFromAuthorityURI: () => null,

    createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

    createAuthorityProphet: () => null,
  };
}
