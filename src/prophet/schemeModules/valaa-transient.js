// @flow

export default function createValaaTransientScheme (/* { logger } */) {
  return {
    scheme: "valaa-transient",

    getAuthorityURIFromPartitionURI: () => `valaa-transient:`,

    getInteractableURLFromAuthorityURI: () => null,

    createDefaultAuthorityConfig: (/* partitionURI: URL */) => ({}),

    createAuthorityProphet: () => null,
  };
}
