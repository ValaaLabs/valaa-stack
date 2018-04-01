import commonFieldInfos from "~/valaa-core/tools/graphql/commonFieldInfos";
import invariantify from "~/valaa-tools/invariantify";

/**
 * Field information section for a mutation payload field, ie. a field that is part of the query
 * result.
 *
 * @export
 * @param {any} targetFieldName
 * @param {any} type
 * @param {any} description
 * @param {any} [additionalDescriptors={}]
 * @returns
 */
export default function mutationPayloadField (targetFieldName, type, description,
    additionalDescriptors = {}) {
  invariantify(type, "mutationPayloadField.type");
  const common = commonFieldInfos(targetFieldName, type, description);
  const ret = {
    [targetFieldName]: {
      ...common,
      isMutationPayload: true,
      ...additionalDescriptors,
    },
  };
  return ret;
}
