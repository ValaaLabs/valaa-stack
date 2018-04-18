// @flow

import createSymbolAliases from "~/valaa-engine/ValaaSpace/createSymbolAliases";

import injectLensObjects from "./injectLensObjects";

export default function extendValaa (scope: Object, hostObjectDescriptors: any) {
  const Valaa = scope.Valaa || (scope.Valaa = {});
  Valaa.Lens = injectLensObjects(Valaa, scope, hostObjectDescriptors);
  createSymbolAliases(Valaa, Valaa.Lens);
}
