// @flow
import { GraphQLObjectType } from "graphql/type";

import aliasField from "~/core/tools/graphql/aliasField";
import primaryField from "~/core/tools/graphql/primaryField";
import { toOne } from "~/core/tools/graphql/coupling";

import Describable from "~/core/schema/Describable";
import Discoverable from "~/core/schema/Discoverable";
import ResourceStub from "~/core/schema/ResourceStub";
import Position from "~/core/schema/Position";
import Resource from "~/core/schema/Resource";
import Scope from "~/script/schema/Scope";

import Relatable, { relatableInterface } from "~/script/schema/Relatable";

const OBJECT_DESCRIPTION = "relation";

export default new GraphQLObjectType({
  name: "Relation",

  interfaces: () => [Relatable, Scope, Describable, Discoverable, Resource, ResourceStub],

  description: "An abstract relation between typically two objects which can have properties.",

  fields: () => ({
    ...relatableInterface(OBJECT_DESCRIPTION).fields(),

    ...aliasField("source", "owner", Relatable,
        "The source entity of this relation",
        { coupling: toOne({ coupledField: "relations" }) },
    ),

    ...primaryField("target", Relatable,
        "The target entity of this relation",
        { coupling: toOne({ coupledField: "incomingRelations" }) },
    ),

    ...primaryField("position", Position,
        "The position of the target entity in the source context",
    ),

    ...primaryField("rotation", Position,
        "The rotation of the target entity in the source context, in degrees",
    ),
  }),
});
