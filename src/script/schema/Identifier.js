// @flow
import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from "graphql/type";

import VALK from "~/core/VALK";
import generatedField from "~/core/tools/graphql/generatedField";
import primaryField from "~/core/tools/graphql/primaryField";
import dataFieldValue from "~/core/tools/denormalized/dataFieldValue";

import Data from "~/core/schema/Data";
import Discoverable from "~/core/schema/Discoverable";
import LiteralValue from "~/core/schema/LiteralValue";
import Tag from "~/core/schema/Tag";

import { invariantifyId } from "~/core/ValaaReference";

import Expression, { expressionInterface } from "./Expression";

const OBJECT_DESCRIPTION = "identifier";

// FIXME(iridian): This must be renamed to Pointer (or other). Identifier is semantically incorrect
// and misleading: Identifier is the 'compile time' name of an indirection with not yet
// determined value, however this structure contains the actual 'runtime' value of an indirection
// (which doesn't even need to be an identifier of any shape as this is just an Expression which
// can be used directly as a parameter to other Expression's).
// FIXME(iridian): While at it, rename 'reference' to 'target'.

/**
 * Returns an expanded Identifier with given target.
 *
 * @export
 * @param null target
 * @param {any} IdData
 * @returns
 */
export function identifier (target) {
  invariantifyId(target, "reference.target", { allowNull: true });
  return { typeName: "Identifier", reference: target };
}

export default new GraphQLObjectType({
  name: "Identifier",

  interfaces: () => [Expression, Tag, Data],

  fields: () => ({
    ...expressionInterface(OBJECT_DESCRIPTION).fields(),

    ...primaryField("reference", Discoverable,
        "The Discoverable the identifier refers to",
    ),

    ...generatedField("asVAKON", LiteralValue,
        `The Identifier reference as asVAKON object reference`,
        source => {
          if (!source.hasOwnProperty("_VAKON")) {
            source._VAKON = VALK.fromObject(dataFieldValue(source, "reference")).toJSON();
          }
          return source._VAKON;
        },
    ),

    ...generatedField("expressionText", new GraphQLNonNull(GraphQLString),
        "Text representation of the literal value as per ECMA-262 JSON.stringify",
        textFromReference,
    ),

    ...generatedField("tagURI", new GraphQLNonNull(GraphQLString),
        `Identifier tag URI format is tag://valaa.com,2017:Identifier/discoverableId
where discoverableId is the resource id of the Discoverable resources this Identifier refers to.`,
        source => `tag://valaa.com,2017:Identifier/${dataFieldValue(source, "reference")}`,
    ),
  }),
});

function textFromReference (reference) {
  if (!reference) return "null";
  // TODO(iridian): Add support for $`name` for references to Discoverable's
  return `$$id\`${reference}\``;
}
