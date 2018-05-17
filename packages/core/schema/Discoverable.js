// @flow
import { GraphQLInterfaceType, GraphQLString, GraphQLList } from "graphql/type";

import primaryField from "~/core/tools/graphql/primaryField";
import aliasField from "~/core/tools/graphql/aliasField";
import { typeNameResolver } from "~/core/tools/graphql/typeResolver";

import ResourceStub from "~/core/schema/ResourceStub";
import Resource, { resourceInterface } from "~/core/schema/Resource";

import Tag from "~/core/schema/Tag";

const INTERFACE_DESCRIPTION = "discoverable";

export function discoverableInterface (objectDescription: string = INTERFACE_DESCRIPTION) {
  return {
    name: "Discoverable",

    description: "An object that can be searched using various means",

    interfaces: () => [Resource, ResourceStub],

    fields: () => ({
      ...resourceInterface(objectDescription).fields(),

      ...primaryField("name", GraphQLString,
          `Primary searchable name of this ${objectDescription}. It is globally non-unique, {
              ""}but possibly context-dependently unique`),

      ...aliasField("nameAlias", "name", GraphQLString,
          `Primary searchable name of this ${objectDescription}. It is globally non-unique, {
              ""}but possibly context-dependently unique. This is an alias for Discoverable.name ${
              ""}to bypass conflicts with native javascript property 'name'.`,
      ),

      ...primaryField("tags", new GraphQLList(Tag),
          `Tags of this ${objectDescription}`),
    }),

    resolveType: typeNameResolver,
  };
}

export default new GraphQLInterfaceType(discoverableInterface());
