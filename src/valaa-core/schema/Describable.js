// @flow
import { GraphQLInterfaceType, GraphQLList } from "graphql/type";
import primaryField from "~/valaa-core/tools/graphql/primaryField";
import { typeNameResolver } from "~/valaa-core/tools/graphql/typeResolver";
import { toManyOwnlings } from "~/valaa-core/tools/graphql/coupling";

import Description from "~/valaa-core/schema/Description";
import Discoverable, { discoverableInterface } from "~/valaa-core/schema/Discoverable";
import ResourceStub from "~/valaa-core/schema/ResourceStub";
import Resource from "~/valaa-core/schema/Resource";

const INTERFACE_DESCRIPTION = "describable";

export function describableInterface (objectDescription: string = INTERFACE_DESCRIPTION) {
  return {
    name: "Describable",

    description: "An object that can be searched using various means",

    interfaces: () => [Discoverable, Resource, ResourceStub],

    fields: () => ({
      ...discoverableInterface(objectDescription).fields(),

      ...primaryField("description", new GraphQLList(Description),
          `The description of this ${objectDescription}`,
          { coupling: toManyOwnlings() },
      ),
    }),

    resolveType: typeNameResolver,
  };
}

export default new GraphQLInterfaceType(describableInterface());
