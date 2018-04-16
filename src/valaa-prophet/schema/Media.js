// @flow
import { GraphQLObjectType, GraphQLString, GraphQLInt } from "graphql/type";

import primaryField from "~/valaa-core/tools/graphql/primaryField";
import { toOne } from "~/valaa-core/tools/graphql/coupling";

import Blob from "~/valaa-core/schema/Blob";
import Describable from "~/valaa-core/schema/Describable";
import Discoverable from "~/valaa-core/schema/Discoverable";
import ResourceStub from "~/valaa-core/schema/ResourceStub";
import Resource from "~/valaa-core/schema/Resource";
import MediaType from "~/valaa-core/schema/MediaType";
import Scope from "~/valaa-script/schema/Scope";

import Relatable, { relatableInterface } from "~/valaa-script/schema/Relatable";

const OBJECT_DESCRIPTION = "media";

export const MEDIA_FROM_ANY = "MEDIA_FROM_ANY";
export const MEDIA_FROM_DIRECTORY = "MEDIA_FROM_DIRECTORY";

export default new GraphQLObjectType({
  name: "Media",

  description: `Describes an identifiable singular whole of ${OBJECT_DESCRIPTION} content, ` +
      `means of accessing it and metadata associated with it. This content can undergo updates.`,

  interfaces: () => [Relatable, Scope, Describable, Discoverable, Resource, ResourceStub],

  recognizers: () => [
    { text: { directory: MEDIA_FROM_DIRECTORY } },
    MEDIA_FROM_ANY,
  ],

  fields: () => ({
    ...relatableInterface(OBJECT_DESCRIPTION).fields(),

    ...primaryField("sourceURL", GraphQLString,
        `The source URL of this ${OBJECT_DESCRIPTION}`),

    // TODO(iridian): Make this Non-null again and fix the imports
    // type: new GraphQLNonNull(MediaType),
    ...primaryField("mediaType", MediaType,
        `The media type of this ${OBJECT_DESCRIPTION}`),

    ...primaryField("size", GraphQLInt,
        `Size of the ${OBJECT_DESCRIPTION
            } content in bytes if known, null otherwise (f.ex. if streaming content)`),

    ...primaryField("content", Blob,
        `Content of the ${OBJECT_DESCRIPTION
            } if known, null otherwise (f.ex. if streaming content)`,
        { coupling: toOne({ coupledField: "contentReferrers" }) }),

    ...primaryField("extension", GraphQLString,
        `File extension of this ${OBJECT_DESCRIPTION}`),

    ...primaryField("created", GraphQLString,
        `The creation ISO-8601 date of this ${OBJECT_DESCRIPTION}`),

    // TODO(iridian): Add validation!
    ...primaryField("modified", GraphQLString,
        `The last modification ISO-8601 date of this ${OBJECT_DESCRIPTION}`),
  }),
});
