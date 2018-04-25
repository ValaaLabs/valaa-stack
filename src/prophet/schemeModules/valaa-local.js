// @flow

export default function createValaaLocalScheme (/* { logger } */) {
  return {
    scheme: "valaa-local",

    getAuthorityURIFromPartitionURI: () => `valaa-local:`,

    getInteractableURLFromAuthorityURI: () => null,

    createDefaultAuthorityConfig: (/* partitionURI: URL */) => ({}),

    createAuthorityProphet: () => null,
  };
}
