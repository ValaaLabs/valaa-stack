import Kuery from "~/raem/VALK/Kuery";

export default function kueryHash (kuery) {
  // FIXME(iridian): Completely non-checked and hack. This should be properly implemented, now:
  // 1. guarantees that literally same kuery object representations gets turned into same string
  // 2. doesn't guarantee semantically different kueries from turning into different strings
  // 3. doesn't guarantee semantically same kueries turning into same string
  return typeof kuery !== "object" ? String(kuery)
      : (kuery instanceof Kuery) && kuery.isExpression() ? kuery.toDumpify()
      : JSON.stringify(kuery);
}
