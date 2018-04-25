// @flow

import { mergeDeepWith } from "~/tools/mergeDeep";

import { unthunkRepeat, isThunk, isExpandable } from "~/inspire/ui/thunk";

// TODO(iridian): The presentation system requires a simplification overhaul.

export default function inheritPresentation (presentation: any, overrides: any, initial: any) {
  const presentations = [initial, presentation, overrides].filter(value => value);
  if (!presentations.length) {
    return {};
  }
  if (presentations.length === 1) {
    return presentations[0];
  }
  return (context) => {
    function mergePresentations (left, rightP) {
      const right = unthunkRepeat(rightP, context);
      if (!right) return left;
      if (!isExpandable(left) || !isExpandable(right)) {
        return right;
      }
      return mergeDeepWith(left, right, (baseChild, overridingChild) =>
          ((!isThunk(overridingChild) && !isExpandable(overridingChild))
              ? overridingChild
          : (isThunk(baseChild) || isThunk(overridingChild))
              ? inheritPresentation(baseChild, overridingChild)
          : undefined));
    }
    let mergeTarget = isThunk(presentations[0]) ? unthunkRepeat(presentations[0], context)
        : isExpandable(presentations[0]) ? { ...presentations[0] }
        : presentations[0];
    mergeTarget = mergePresentations(mergeTarget, presentations[1]);
    return mergePresentations(mergeTarget, presentations[2]);
  };
}
