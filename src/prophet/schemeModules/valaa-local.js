// @flow

export default function createValaaLocalScheme (/* { logger } */) {
  return {
    scheme: "valaa-local",

    getAuthorityURIFromPartitionURI: () => `valaa-local:`,

    createDefaultAuthorityConfig: (/* partitionURI: URL */) => ({}),

    createAuthorityProphet: () => null,
  };
}
