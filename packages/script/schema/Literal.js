// @flow
import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from "graphql/type";

import VALK from "~/core/VALK";
import generatedField from "~/core/tools/graphql/generatedField";
import primaryField from "~/core/tools/graphql/primaryField";
import dataFieldValue from "~/core/tools/denormalized/dataFieldValue";

import Data from "~/core/schema/Data";

import LiteralValue from "~/core/schema/LiteralValue";
import Tag from "~/core/schema/Tag";

import invariantify from "~/tools/invariantify";

import Expression, { expressionInterface } from "./Expression";

const OBJECT_DESCRIPTION = "literal";

/**
 * Returns an expanded Literal with given literal value.
 *
 * @export
 * @param null value
 */
export function literal (value: any) {
  invariantify((typeof value !== "undefined") && (typeof value !== "function"),
      `literal.value must be a valid JSON object, got ${typeof value}`);
  if (value && (typeof value === "object")) {
    const proto = Object.getPrototypeOf(value);
    invariantify((proto === Object.prototype) || (proto === Array.prototype),
        "if literal.value is an object it must a plain Object or Array, got", value);
    // TODO(iridian): Contents of the containers are not validated.
  }
  // TODO(iridian): either fill or remove the "type" field.
  return { typeName: "Literal", value };
}

// FIXME(iridian): Add proper support for JS types, now output is always strings.
export default new GraphQLObjectType({
  name: "Literal",

  description: "A JSON literal of type String, Number, Boolean or null",

  interfaces: () => [Expression, Tag, Data],

  fields: () => ({
    ...expressionInterface(OBJECT_DESCRIPTION).fields(),

    ...primaryField("value", LiteralValue,
        "The literal value as JS native representation",
    ),

    ...generatedField("asVAKON", LiteralValue,
        `The Literal value as asVAKON literal`,
        source => {
          if (!source.hasOwnProperty("_VAKON")) {
            const value = dataFieldValue(source, "value");
            source._VAKON = (typeof value === "undefined")
                ? VALK.void()
                : VALK.fromValue(value).toJSON();
          }
          return source._VAKON;
        },
    ),

    ...generatedField("expressionText", new GraphQLNonNull(GraphQLString),
        "Text representation of the literal value as per ECMA-262 JSON.stringify",
        source => JSON.stringify(dataFieldValue(source, "value")),
    ),

    ...generatedField("tagURI", new GraphQLNonNull(GraphQLString),
        `Literal tag URI format is tag://valaa.com,2017:Literal/uriString where the uriString {
            ""} is encodeURIComponent(JSON.stringify(value)), with value as JSON`,
        source => `tag://valaa.com,2017:Literal/${
            encodeURIComponent(JSON.stringify(dataFieldValue(source, "value")))}`,
    ),

    ...generatedField("literal", new GraphQLNonNull(GraphQLString),
        "Deprecated field",
        () => undefined,
        { deprecated: { prefer: "asVAKON or value" } },
    ),
  }),
});
