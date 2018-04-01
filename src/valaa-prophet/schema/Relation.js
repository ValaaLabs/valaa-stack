// @flow
import { GraphQLObjectType } from "graphql/type";

import aliasField from "~/valaa-core/tools/graphql/aliasField";
import primaryField from "~/valaa-core/tools/graphql/primaryField";
import { toOne } from "~/valaa-core/tools/graphql/coupling";

import Describable from "~/valaa-core/schema/Describable";
import Discoverable from "~/valaa-core/schema/Discoverable";
import ResourceStub from "~/valaa-core/schema/ResourceStub";
import Position from "~/valaa-core/schema/Position";
import Resource from "~/valaa-core/schema/Resource";
import Scope from "~/valaa-script/schema/Scope";

import Relatable, { relatableInterface } from "~/valaa-prophet/schema/Relatable";

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
