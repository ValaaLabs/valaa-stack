// @flow

import URLSearchParams from "url-search-params";

import { invariantifyString, invariantifyObject } from "~/valaa-tools/";

/**
 * PartitionURI is an universal identifier for a partition. Different parts of the URI define
 * different aspects of the partition.
 *
 * URI scheme part: denotes the main partition storage strategy. One of the following:
 *   - "valaa-transient": partition is local to the client and not persisted across client restarts.
 *     authority part must be empty, thus making this URI not a URL.
 *   - "valaa-local": partition is local to the client device but is persisted.
 *     authority part must be empty, thus making this URI not a URL.
 *   - "valaa-aws": partition is stored in some Valaa AWS backend. This backend is located at the
 *     location specified by the authority host part, making this partition URI a URL.
 *   Future candidate schemes:
 *   - "valaa-azure": same as valaa-aws, but for azure.
 *   - "valaa": partition location is not specified (authority part must be empty). The authority
 *     for this partition must be known by the surrounding context.
 *
 * URI authority part: contains the location of the authority backend for this partition.
 *
 * URI path part: TODO(iridian): is partition id stored here?
 *
 * URI query part: TODO(iridian): is partition id stored here? maybe id=partitionId?
 *
 * URI fragment part: TODO(iridian): Used for anything
 *
 * If partition URI is an URL and contains
 * a network authority part
 */
export type PartitionURI = URL;

const PARTITION_URI_LRU_MAX_SIZE = 1000;
const partitionURILRU = new Map();


/**
 * Creates a partition URI from one or two string as a native URL object.
 * If only one string is given it is considered to be the full partition URI string and consumed
 * as is.
 * If the optional partitionRawId is specified the baseString is considered to be the partition
 * authority URI, and the full partition URI is generated as per authority URI schema.
 *
 * @export
 * @param {string} baseString
 * @param null partitionRawId
 * @param {any} string
 * @returns {PartitionURI}
 */
export function createPartitionURI (baseString: string, partitionRawId: ?string): PartitionURI {
  invariantifyString(baseString, "createPartitionURI.baseString", { allowEmpty: false });
  invariantifyString(partitionRawId, "createPartitionURI.partitionRawId", { allowUndefined: true });
  const partitionURIString = (typeof partitionRawId === "undefined")
      ? baseString
      : `${baseString}?id=${encodeURIComponent(partitionRawId)}`;
  let ret = partitionURILRU.get(partitionURIString);
  if (ret) {
    if (partitionURILRU.size < PARTITION_URI_LRU_MAX_SIZE) return ret;
    partitionURILRU.delete(partitionURIString);
  } else {
    ret = createValaaURI(partitionURIString);
    if (partitionURILRU.size >= PARTITION_URI_LRU_MAX_SIZE) {
      for (const [key] of partitionURILRU) {
        partitionURILRU.delete(key);
        break;
      }
    }
  }
  partitionURILRU.set(partitionURIString, ret);
  return ret;
}

export function getValaaURI (uri: URL | string): URL {
  if (typeof uri === "string") return createValaaURI(uri);
  return uri;
}

export function createValaaURI (uriString: string): URL {
  if (typeof uriString !== "string") return undefined;
  const ret = new URL(uriString);
  if (!ret.searchParams && ret.search) ret.searchParams = new URLSearchParams(ret.search);
  return ret;
}

export function getPartitionRawIdFrom (partitionURI: PartitionURI): string {
  invariantifyObject(partitionURI, "partitionURI",
    { instanceof: URL, allowEmpty: true });
  return decodeURIComponent(partitionURI.searchParams.get("id"));
}

export function getPartitionAuthorityURIStringFrom (partitionURI: PartitionURI): string {
  return `${partitionURI.protocol}${partitionURI.host || ""}${partitionURI.pathname}`;
}

export function createLocalPartitionURIFromRawId (rawId: string): PartitionURI {
  return createPartitionURI("valaa-local:", rawId);
}

export function createTransientPartitionURIFromRawId (rawId: string): PartitionURI {
  return createPartitionURI("valaa-transient:", rawId);
}

export function createTestPartitionURIFromRawId (rawId: string): PartitionURI {
  return createPartitionURI("valaa-test:", rawId);
}
