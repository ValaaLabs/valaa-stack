// @flow
import { GraphQLScalarType } from "graphql/type";
import { byValueType } from "~/valaa-core/tools/graphql/literalResolver";

// Note: null is always represented on the container level
// TODO(iridian): Figure out how this works with lists?
export default new GraphQLScalarType({
  name: "LiteralValue",
  serialize: nullifyNonLiteralValues,
  parseValue: nullifyNonLiteralValues,
  parseLiteral (ast) {
    return ast.value;
  },
});

function nullifyNonLiteralValues (value) {
  return byValueType(value, {
    whenString: value, whenNumber: value, whenBoolean: value, whenJSON: value,
  });
}
