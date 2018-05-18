// @flow
import { GraphQLList, GraphQLInterfaceType } from "graphql/type";

import primaryField from "~/raem/tools/graphql/primaryField";
import { toManyOwnlings } from "~/raem/tools/graphql/coupling";
import { typeNameResolver } from "~/raem/tools/graphql/typeResolver";

import Property from "./Property";

const INTERFACE_DESCRIPTION = "scope";

// Note: scopeInterface doesn't introduce either resource or data fields. They must be explicitly
// introduced.
export function scopeInterface (objectDescription: string = INTERFACE_DESCRIPTION) {
  return {
    name: "Scope",

    description: "A scope of variables by name",

    fields: () => ({
      ...primaryField("properties", new GraphQLList(Property),
          `Properties of ${objectDescription} as a list of key-value pairs`,
          { coupling: toManyOwnlings() },
      ),
    }),

    resolveType: typeNameResolver,
  };
}

export default new GraphQLInterfaceType(scopeInterface());
