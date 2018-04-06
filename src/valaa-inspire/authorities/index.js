// @flow

import type { PartitionURI } from "~/valaa-core/tools/PartitionURI";

// authorityProvider default configs
export const authorityConfigs = {
};

export function getAuthorityURLFromPartitionURI (partitionURI: PartitionURI): ?string {
  // TODO(iridian): Decide the authorityURL schema: it might contain the partition in it or not,
  // or even depend upon the authority type ("AWS", "Azure"...) how it is contained.
  // To start we just treat the authorityURL as the authorityURL directly.
  if (partitionURI.protocol === "valaa-transient:") return null;
  if (partitionURI.protocol === "valaa-local:") return null;
  return undefined;
}

export function createAuthorityProxy (configs: Object, authorityURL: string):
    Prophet {
  const config = configs[authorityURL];
  try {
    if (!config) {
      throw new Error(`No Valaa authority config found for '${authorityURL}'`);
    }
    throw new Error(`Unrecognized Valaa authority type '${config.type}'`);
  } catch (error) {
    throw this.wrapErrorEvent(error, `createAuthorityProxy('${authorityURL}')`,
        "\n\tconfig:", config,
        "\n\tconfigs:", configs);
  }
}
