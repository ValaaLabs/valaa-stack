// @flow
import { GraphQLObjectType, GraphQLInt } from "graphql/type";
import primaryField from "~/valaa-core/tools/graphql/primaryField";

import Data, { dataInterface } from "~/valaa-core/schema/Data";

const OBJECT_DESCRIPTION = "position";

export default new GraphQLObjectType({
  name: "Position",

  deprecated: { prefer: "Value Literal's" },

  interfaces: () => [Data],

  fields: () => ({
    ...dataInterface(OBJECT_DESCRIPTION).fields(),

    ...primaryField("x", GraphQLInt, "X coordinate of the position"),
    ...primaryField("y", GraphQLInt, "Y coordinate of the position"),
    ...primaryField("z", GraphQLInt, "Z coordinate of the position"),
  }),
});
