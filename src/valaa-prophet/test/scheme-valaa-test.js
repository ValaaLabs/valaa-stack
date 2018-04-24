// @flow

export default function createValaaTestScheme (/* { logger } */) {
  return {
    scheme: "valaa-test",

    getAuthorityURIFromPartitionURI: () => `valaa-test:`,

    getInteractableURLFromAuthorityURI: () => null,

    createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

    createAuthorityProphet: () => null,
  };
}
