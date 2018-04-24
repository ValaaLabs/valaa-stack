// @flow
import { GraphQLObjectType, GraphQLNonNull, GraphQLInt, GraphQLString, GraphQLList
    } from "graphql/type";
import { fromJS } from "immutable";

import generatedField from "~/core/tools/graphql/generatedField";
import primaryField from "~/core/tools/graphql/primaryField";
import dataFieldValue from "~/core/tools/denormalized/dataFieldValue";

import Data, { dataInterface } from "~/core/schema/Data";

const OBJECT_DESCRIPTION = "semantic version";

export default new GraphQLObjectType({
  name: "SemVer",

  description: "Semantic version number, as per http://semver.org/spec/v2.0.0.html",

  interfaces: () => [Data],

  fields: () => ({
    ...dataInterface(OBJECT_DESCRIPTION).fields(),

    ...generatedField("text", GraphQLString,
        "The version number text",
        textFromSemVer,
    ),

    ...primaryField("major", new GraphQLNonNull(GraphQLInt),
        "The major version number of the semantic version",
    ),

    ...primaryField("minor", new GraphQLNonNull(GraphQLInt),
        "The minor version number of the semantic version",
    ),

    ...primaryField("patch", new GraphQLNonNull(GraphQLInt),
        "The patch version number of the semantic version",
   ),

    ...primaryField("preRelease", new GraphQLList(GraphQLString),
        "The pre-release version of the semantic version",
    ),

    ...primaryField("build", new GraphQLList(GraphQLString),
        "The build metadata of the semantic version",
    ),
  }),
});

export function textFromSemVer (semanticVersion: ?Object) {
  if (!semanticVersion) return semanticVersion;
  const version = typeof semanticVersion.major === "undefined"
      ? semanticVersion : fromJS(semanticVersion);
  const preRelease = [...(dataFieldValue(version, "preRelease") || [])].join(".");
  const build = [...(dataFieldValue(version, "build") || [])].join(".");
  return `${dataFieldValue(version, "major")}.${dataFieldValue(version, "minor")}.${
      dataFieldValue(version, "patch")}${
      (preRelease && `-${preRelease}`) || ""}${build && `+${build || ""}`}`;
}

// From http://stackoverflow.com/questions/12317049/how-to-split-a-long-regular-expression-into-
// multiple-lines-in-javascript
const semVerRegex = new RegExp([
  /^(0|[1-9]\d*)/,
  /\.(0|[1-9]\d*)/,
  /\.(0|[1-9]\d*)/,
  /(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?/,
  /(\+([0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*))?/,
  /$/,
].map(r => r.source).join(""));

export function semVerFromText (text: string) {
  const matches = semVerRegex.exec(text);
  if (!matches) return null;
  return {
    major: matches[1],
    minor: matches[2],
    patch: matches[3],
    preRelease: matches[5] ? matches[5].split(".") : [],
    build: matches[9] ? matches[9].split(".") : [],
  };
}

export function semVerFromDenormalized (denormalized: ?Object) {
  if (!denormalized) return undefined;
  const { major, minor, patch, preRelease, build } = denormalized.toJS();
  return { major, minor, patch, preRelease, build };
}
