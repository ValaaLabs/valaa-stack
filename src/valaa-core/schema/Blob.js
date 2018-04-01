// @flow
import { GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLID, GraphQLList }
    from "graphql/type";

import generatedField from "~/valaa-core/tools/graphql/generatedField";
import transientField from "~/valaa-core/tools/graphql/transientField";
import { toMany } from "~/valaa-core/tools/graphql/coupling";

export default new GraphQLObjectType({
  name: "Blob",

  fields: () => ({
    ...generatedField("id", new GraphQLNonNull(GraphQLID),
        `Content-hashed identifier of the blob`,
        blob => blob.get("id")
    ),

    ...generatedField("blobId", new GraphQLNonNull(GraphQLString),
        `Globally unique identifier string of this blob`,
        blob => blob.get("id").rawId(),
    ),

    ...transientField("contentReferrers", new GraphQLList(GraphQLID),
        `Incoming references to this Blob`,
        { coupling: toMany({ defaultCoupledField: "content" }) }),
  }),
});
