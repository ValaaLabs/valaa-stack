import commonFieldInfos from "~/valaa-core/tools/graphql/commonFieldInfos";
import immutableResolver from "~/valaa-core/tools/graphql/immutableResolver";
import linkResolver from "~/valaa-core/tools/graphql/linkResolver";
import listLinkResolver from "~/valaa-core/tools/graphql/listLinkResolver";

import invariantify from "~/valaa-tools/invariantify";

/**
 * Field information section for a primary field, ie. a field which is persisted.
 *
 * @export
 * @param {any} targetFieldName
 * @param {any} type
 * @param {any} description
 * @param {any} [additionalDescriptors={}]
 * @returns
 */
export default function primaryField (targetFieldName, type, description,
    additionalDescriptors = {}) {
  invariantify(type, "primaryField.type");
  const common = commonFieldInfos(targetFieldName, type, description);
  const ret = {
    [targetFieldName]: {
      ...common,
      resolve: common.isLeaf ? immutableResolver
          : common.isSequence ? listLinkResolver
          : linkResolver,
      isPrimary: true,
      isWritable: true,
      isPersisted: true,
      isDuplicateable: true,
      isOwned: additionalDescriptors.coupling && additionalDescriptors.coupling.owned,
      ...additionalDescriptors,
    },
  };
  return ret;
}
