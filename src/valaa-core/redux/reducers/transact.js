// @flow

import Bard, { createPassageFromAction } from "~/valaa-core/redux/Bard";

export default function transact (bard: Bard) {
  bard.setPassages((bard.passage.actions || []).map(createPassageFromAction));
  return bard.state;
}
