// @flow
import { GraphQLInterfaceType, GraphQLString } from "graphql/type";
import primaryField from "~/valaa-core/tools/graphql/primaryField";
import { typeNameResolver } from "~/valaa-core/tools/graphql/typeResolver";

import ResourceStub from "~/valaa-core/schema/ResourceStub";
import Resource, { resourceInterface } from "~/valaa-core/schema/Resource";
import Sprite from "~/valaa-core/schema/Sprite";

const INTERFACE_DESCRIPTION = "this presentable content";

export function representationInterface (objectDescription: string = INTERFACE_DESCRIPTION) {
  return {
    name: "Representation",

    description: `A connection between a particular localization configuration and a single
undivisible piece of presentable content, given as collection of data in different forms.
`,

    interfaces: () => [Resource, ResourceStub],

    fields: () => ({
      ...resourceInterface(objectDescription).fields(),

      ...primaryField("textual", GraphQLString,
          `Textual form of content localization for ${objectDescription}`,
      ),

      ...primaryField("aural", Sprite,
          `Aural form of content localization for ${objectDescription}`,
      ),

      ...primaryField("visual", Sprite,
          `Visual form of content localization for ${objectDescription}`,
      ),
    }),

    resolveType: typeNameResolver,
  };
}

const Representation = new GraphQLInterfaceType(representationInterface());

export default Representation;
