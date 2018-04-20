// @flow

import Vrapper from "~/valaa-engine/Vrapper";
import { createNativeIdentifier, isNativeIdentifier, getNativeIdentifierValue }
    from "~/valaa-script";

export function getScopeValue (scope: Object, name: string | Symbol) {
  if (typeof scope === "undefined") return undefined;
  const value = scope[name];
  return isNativeIdentifier(value) ? getNativeIdentifierValue(value) : value;
}

export function setScopeValue (scope: Object, name: string | Symbol, value: any) {
  scope[name] = (value instanceof Vrapper) && (value.tryTypeName() === "Property")
      ? createNativeIdentifier(value)
      : value;
}

export function clearScopeValue (scope: Object, name: string | Symbol) {
  delete scope[name];
}
