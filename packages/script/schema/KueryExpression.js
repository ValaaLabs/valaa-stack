// @flow
import { GraphQLObjectType } from "graphql/type";

import aliasField from "~/raem/tools/graphql/aliasField";
import primaryField from "~/raem/tools/graphql/primaryField";

import Data from "~/raem/schema/Data";

import LiteralValue from "~/raem/schema/LiteralValue";

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
