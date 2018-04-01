import { GraphQLObjectType } from "graphql/type";

/**
 * Creates a trivial implementation resource object type for given Interfaces and a singular
 * interfaceFields.
 */
export default function implementInterface (ObjectName, objectDescription, Interfaces,
    interfaceFields) {
  return new GraphQLObjectType({
    name: ObjectName,

    interfaces: Interfaces,

    fields: () => ({
      ...interfaceFields(objectDescription).fields(),
    }),
  });
}
