// @flow

export default function createValaaTransientScheme (/* { logger } */) {
  return {
    getURIScheme: () => "valaa-transient",

    getAuthorityURIFromPartitionURI: () => `valaa-transient:`,

    getInteractableURLFromAuthorityURI: () => null,

    createDefaultAuthorityConfig: (/* partitionURI: URL */) => {},

    createAuthorityProphet: () => null,
  };
};
