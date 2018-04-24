// @flow

export default function createValaaLocalScheme (/* { logger } */) {
  return {
    getURIScheme: () => "valaa-local",

    getAuthorityURIFromPartitionURI: () => `valaa-local:`,

    getInteractableURLFromAuthorityURI: () => null,

    createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

    createAuthorityProphet: () => null,
  };
}
