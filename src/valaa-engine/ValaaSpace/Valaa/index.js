// @flow

import { ValaaPrimitive } from "~/valaa-script";
import { toVAKON } from "~/valaa-script/VALSK";

import { beaumpify } from "~/valaa-tools";

import injectSchemaFieldBindings from "./injectSchemaFieldBindings";
import injectSchemaTypeBindings from "./injectSchemaTypeBindings";

/*
 * Creates the Valaa introspection object.
**/
export default function extendValaa (scope: any, hostObjectDescriptors: any, schema: any) {
  const Valaa = Object.assign(scope.Valaa || (scope.Valaa = {}), {
    beautify: beaumpify,
    toVAKON,
    Primitive: ValaaPrimitive,
    Lens: null,
  });
  injectSchemaTypeBindings(Valaa, scope);
  if (schema) injectSchemaFieldBindings(Valaa, hostObjectDescriptors, schema);
  return Valaa;
}
