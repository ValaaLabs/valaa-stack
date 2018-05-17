// @flow
import { GraphQLObjectType } from "graphql/type";

import ResourceStub, { resourceStub } from "~/core/schema/ResourceStub";

const OBJECT_DESCRIPTION = "inactive resource";

export default new GraphQLObjectType({
  name: "InactiveResource",

  description: `An InactiveResource is a Resource whose partition has not yet been fully loaded, ${
      ""} and has only the limited set of fields of ResourceStub available. The transition from ${
      ""} InactiveResource to and from other concrete Resource types is the only possible runtime ${
      ""} type change, and happens dynamically based on the partition activation and inactivation.`,

  interfaces: () => [ResourceStub],

  fields: () => ({
    ...resourceStub(OBJECT_DESCRIPTION).fields(),
  }),
});
