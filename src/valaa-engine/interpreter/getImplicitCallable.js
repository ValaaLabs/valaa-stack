// @flow

import getImplicitMediaInterpretation
    from "~/valaa-engine/interpreter/getImplicitMediaInterpretation";

export default function getImplicitCallable (calleeCandidate: any, roleName: string,
    options: Object = {}) {
  options.mime = "application/valaascript";
  const ret = getImplicitMediaInterpretation(calleeCandidate, roleName, options);
  if (typeof ret === "function") return ret;
  if ((typeof ret === "object") && (typeof ret.default === "function")) return ret.default;
  throw new Error(`Could not implicitly convert callee to a function for ${roleName}`);
}
