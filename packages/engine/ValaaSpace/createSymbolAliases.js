// @flow

import { isSymbol } from "~/tools";

export default function createSymbolAliases (topLevelScope: Object, sourceScope: any) {
  Object.getOwnPropertyNames(sourceScope).forEach(name => {
    const value = sourceScope[name];
    if (isSymbol(value)) {
      if (typeof topLevelScope[name] === "undefined") {
        topLevelScope[name] = value;
      } else {
        console.warn(`Cannot create a symbol alias Valaa.${name} to ${
            sourceScope.name}.${name}`, "with value", String(value),
            `because topLevelScope.${name} already exists with value:`, topLevelScope[name]);
      }
    }
  });
}
