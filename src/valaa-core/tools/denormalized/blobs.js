import Bard from "~/valaa-core/redux/Bard";
import getObjectField from "~/valaa-core/tools/denormalized/getObjectField";

export function bardCreateBlobReferenceData (bard, referrerFieldName) {
  return {
    referrerId: bard.objectId,
    referrerFieldName,
    referrerName: getObjectField(Object.create(bard), bard.objectTransient, "name"),
  };
}

export function addBlobReferenceRegisterToRootCommand (bard: Bard, blobId: string,
    referrerFieldName: string) {
  if (!bard.story.isBeingUniversalized) return;
  const adds = bard.rootAction.addedBlobReferences
      || (bard.rootAction.addedBlobReferences = {});
  (adds[blobId] || (adds[blobId] = [])).push(
      bardCreateBlobReferenceData(bard, referrerFieldName));
}

export function addBlobReferenceUnregisterToRootCommand (bard: Bard, blobId: string,
    referrerFieldName: string) {
  if (!bard.story.isBeingUniversalized) return;
  const removes = bard.rootAction.removedBlobReferences
      || (bard.rootAction.removedBlobReferences = {});
  (removes[blobId] || (removes[blobId] = [])).push(
      bardCreateBlobReferenceData(bard, referrerFieldName));
}
