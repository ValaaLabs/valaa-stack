import primaryField from "~/valaa-core/tools/graphql/primaryField";
import { invariantify } from "~/valaa-tools";

/**
 * Field information section for a transient field, ie. a field which is not persisted but can be
 * modified, especially as the other end of couplings.
 *
 * @export
 * @param {any} targetFieldName
 * @param {any} type
 * @param {any} description
 * @param {any} [additionalDescriptors={}]
 * @returns
 */
export default function transientField (targetFieldName, type, description,
    additionalDescriptors = {}) {
  const ret = primaryField(targetFieldName, type, description, {
    isPrimary: false,
    isTransient: true,
    isPersisted: false,
    isDuplicateable: false,
    ...additionalDescriptors,
  });
  invariantify(ret[targetFieldName].isSequence
          || ret[targetFieldName].allowTransientFieldToBeSingular,
      `transientField's cannot be singular (for field '${targetFieldName}')`,
      "\n\tfield candidate:", ret[targetFieldName],
  );
  return ret;
}
