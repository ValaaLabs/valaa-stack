// @flow
import { GraphQLInterfaceType, GraphQLList } from "graphql/type";
import primaryField from "~/core/tools/graphql/primaryField";
import { typeNameResolver } from "~/core/tools/graphql/typeResolver";
import { toManyOwnlings } from "~/core/tools/graphql/coupling";

import ResourceStub from "~/core/schema/ResourceStub";
import Resource, { resourceInterface } from "~/core/schema/Resource";

import Sprite from "./Sprite";

const INTERFACE_DESCRIPTION = "sprite set";

export function spriteSetInterface (objectDescription: string = INTERFACE_DESCRIPTION) {
  return {
    name: "SpriteSet",

    interfaces: () => [Resource, ResourceStub],

    fields: () => ({
      ...resourceInterface(objectDescription).fields(),

      ...primaryField("sprites", new GraphQLList(Sprite),
          `Sprites that make this ${objectDescription}`,
          { coupling: toManyOwnlings() },
      ),
    }),

    resolveType: typeNameResolver,
  };
}

export default new GraphQLInterfaceType(spriteSetInterface());
