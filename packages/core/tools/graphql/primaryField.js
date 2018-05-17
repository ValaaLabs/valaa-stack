import commonFieldInfos from "~/core/tools/graphql/commonFieldInfos";
import immutableResolver from "~/core/tools/graphql/immutableResolver";
import linkResolver from "~/core/tools/graphql/linkResolver";
import listLinkResolver from "~/core/tools/graphql/listLinkResolver";

import invariantify from "~/tools/invariantify";

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
