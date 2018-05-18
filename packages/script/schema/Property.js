// @flow
import { GraphQLObjectType } from "graphql/type";

import primaryField from "~/raem/tools/graphql/primaryField";

import Describable, { describableInterface } from "~/raem/schema/Describable";
import Discoverable from "~/raem/schema/Discoverable";
import ResourceStub from "~/raem/schema/ResourceStub";
import Resource from "~/raem/schema/Resource";

import Expression from "~/script/schema/Expression";

const OBJECT_DESCRIPTION = "property";

export default new GraphQLObjectType({
  name: "Property",

  description: "A string name to expression property",

  interfaces: () => [Describable, Discoverable, Resource, ResourceStub],

  fields: () => ({
    ...describableInterface(OBJECT_DESCRIPTION).fields(),

    ...primaryField("value", Expression,
        "The target of the property",
        { initialValue: null, defaultValue: undefined },
    ),
  }),
});
