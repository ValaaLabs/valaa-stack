import commonFieldInfos from "~/valaa-core/tools/graphql/commonFieldInfos";
import invariantify from "~/valaa-tools/invariantify";

/**
 * Field information section for a mutationInputField field, ie. a field which is provided as part
 * of a mutation operation, containing input data temporarily made part of the state.
 *
 * @export
 * @param {any} targetFieldName
 * @param {any} type
 * @param {any} description
 * @param {any} [additionalDescriptors={}]
 * @returns
 */
export default function mutationInputField (targetFieldName, type, description,
    additionalDescriptors = {}) {
  invariantify(type, "mutationInputField.type");
  const common = commonFieldInfos(targetFieldName, type, description);
  const ret = {
    [targetFieldName]: {
      ...common,
      isMutationInput: true,
      ...additionalDescriptors,
    },
  };
  return ret;
}
