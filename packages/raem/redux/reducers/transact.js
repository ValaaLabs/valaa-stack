// @flow

import Bard, { createPassageFromAction } from "~/raem/redux/Bard";

export default function transact (bard: Bard) {
  bard.setPassages((bard.passage.actions || []).map(createPassageFromAction));
  return bard.state;
}
