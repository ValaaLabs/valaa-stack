// @flow
import Bard, { createPassageFromAction } from "~/core/redux/Bard";

export default function freeze (bard: Bard) {
  bard.setPassages((bard.passage.actions || []).map(createPassageFromAction));
  return bard.state;
}
