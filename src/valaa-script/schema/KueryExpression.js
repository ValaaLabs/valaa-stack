// @flow
import { GraphQLObjectType } from "graphql/type";

import aliasField from "~/valaa-core/tools/graphql/aliasField";
import primaryField from "~/valaa-core/tools/graphql/primaryField";

import Data from "~/valaa-core/schema/Data";

import LiteralValue from "~/valaa-core/schema/LiteralValue";

import Expression, { expressionInterface } from "./Expression";

const OBJECT_DESCRIPTION = "Raw VAKON expression";

export default new GraphQLObjectType({
  name: "KueryExpression",

  description: "Expression defined directly by any arbitrary raw VAKON expression in field 'vakon'",

  interfaces: () => [Expression, Data],

  fields: () => ({
    ...expressionInterface(OBJECT_DESCRIPTION).fields(),

    ...primaryField("vakon", LiteralValue,
        "The raw VAKON expression",
    ),

    ...aliasField("asVAKON", "vakon", LiteralValue, "Direct alias for field 'vakon'"),
  }),
});
