import objectHash from "object-hash";
import { v4 as uuid } from "uuid";
import { isId as exportIsId } from "~/valaa-tools/invariantify";

// FIXME(iridian): This is inconsistent with contentHashResolver
export default function createId ({ typeName, owner, initialState, parentId, ...rest },
    { immutableType = false } = {}) {
  // TODO(iridian): This is missing handling for default members
  if (immutableType) return immutableObjectId(initialState);

  // TODO: fast deterministic id creation (object-hash is too slow)
  // if (parentId) return objectHash({ typeName, owner, initialState, parentId, ...rest });

  // TODO: Combine all existing id creation code here: notably, content hashing for Data types
  // and some deterministic id generation based on owner (with possible update) for Resource types.
  return uuid();
}

export function immutableObjectId (state) {
  return objectHash(state);
}

// A bit dirty dependency inversion here.
export const isId = exportIsId;
