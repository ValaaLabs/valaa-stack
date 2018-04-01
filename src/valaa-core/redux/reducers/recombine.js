// @flow

import { createPassageFromAction } from "~/valaa-core/redux/Bard";
import {
  DuplicateBard,
  prepareDuplicationContext, postProcessDuplicationContext,
} from "~/valaa-core/redux/reducers/construct";
import { obtainVRef, getRawIdFrom } from "~/valaa-core/ValaaReference";

export default function recombine (bard: DuplicateBard) {
  // Execute first pass, scan-and-duplicate-hierarchy by reducing all contained DUPLICATEDs
  prepareDuplicationContext(bard);
  bard.setPassages((bard.passage.actions || []).map(action => {
    let newId = action.id
    // If the directive updates the owner we mark the new id as null: this will omit the entry
    // from the first phase ownling fields. When the DUPLICATED directive is later on actually
    // evaluated it will set the lookup id value propertly for the subsequent phases.
        && !(action.initialState && (action.initialState.owner || action.initialState.source))
        && !(action.preOverrides && (action.preOverrides.owner || action.preOverrides.source))
            ? obtainVRef(action.id)
            : null;
    if (newId && bard.tryGoToTransientOfRawId(
        newId.rawId(), "ResourceStub", false, newId.tryGhostPath())) {
      newId = bard.objectId;
    }
    bard._duplicateIdByOriginalRawId[getRawIdFrom(action.duplicateOf)] = newId;
    return createPassageFromAction(action);
  }));
  bard.initiatePassageAggregation();
  bard.updateStateWithPassages();
  postProcessDuplicationContext(bard);

  // Second pass, fill-lateral-references-and-couplings by reducing the aggregated sub-stories.
  return bard.updateStateWithPassages(bard.passage,
      bard.finalizeAndExtractAggregatedPassages());
}
