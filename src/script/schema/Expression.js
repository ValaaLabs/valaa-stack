// @flow
import { GraphQLInterfaceType, GraphQLString } from "graphql/type";
import { dataTypeResolver } from "~/core/tools/graphql/typeResolver";
import generatedField from "~/core/tools/graphql/generatedField";

import Data, { dataInterface } from "~/core/schema/Data";
import LiteralValue from "~/core/schema/LiteralValue";

const INTERFACE_DESCRIPTION = "expression";

export function expressionInterface (objectDescription: string = INTERFACE_DESCRIPTION) {
  return {
    name: "Expression",

    interfaces: () => [Data],

    fields: () => ({
      ...dataInterface(objectDescription).fields(),

      ...generatedField("expressionText", GraphQLString,
          `The ${objectDescription} text`,
          () => "<expression text resolution support removed>",
      ),

      ...generatedField("asVAKON", LiteralValue,
          `The ${objectDescription} as asVAKON literal`,
          () => undefined,
      ),
    }),

    resolveType: dataTypeResolver,
  };
}

export default new GraphQLInterfaceType(expressionInterface());
