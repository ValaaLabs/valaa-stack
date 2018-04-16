// @flow
import { GraphQLInterfaceType, GraphQLList } from "graphql/type";

import { toMany, toManyOwnlings } from "~/valaa-core/tools/graphql/coupling";
import { typeNameResolver } from "~/valaa-core/tools/graphql/typeResolver";
import primaryField from "~/valaa-core/tools/graphql/primaryField";
import transientField from "~/valaa-core/tools/graphql/transientField";

import Discoverable from "~/valaa-core/schema/Discoverable";
import Describable, { describableInterface } from "~/valaa-core/schema/Describable";
import ResourceStub from "~/valaa-core/schema/ResourceStub";
import Resource from "~/valaa-core/schema/Resource";

import Relation from "~/valaa-script/schema/Relation";
import Scope, { scopeInterface } from "~/valaa-script/schema/Scope";

const INTERFACE_DESCRIPTION = "entity";

export function relatableInterface (objectDescription: string = INTERFACE_DESCRIPTION) {
  return {
    name: "Relatable",

    description: "Interface for resources that can be set as Relation.source and Relation.target.",

    interfaces: () => [Scope, Describable, Discoverable, Resource, ResourceStub],

    resolveType: typeNameResolver,

    fields: () => ({
      ...describableInterface(objectDescription).fields(),
      ...scopeInterface(objectDescription).fields(),

      ...primaryField("relations", new GraphQLList(Relation),
          "List of relations that this entity has",
          { coupling: toManyOwnlings() },
      ),

      ...transientField("incomingRelations", new GraphQLList(Relation),
          "List of relations that are bound to this entity",
          { coupling: toMany({ coupledField: "target" }) },
      ),
    }),
  };
}

export default new GraphQLInterfaceType(relatableInterface());
