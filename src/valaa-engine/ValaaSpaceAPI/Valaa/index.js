// @flow

import { ValaaPrimitive } from "~/valaa-script";
import { toVAKON } from "~/valaa-script/VALSK";

import createTopLevelSymbolAliases from "~/valaa-engine/ValaaSpaceAPI/Valaa/createTopLevelSymbolAliases";

import { beaumpify } from "~/valaa-tools";

import injectSchemaFieldBindings from "./injectSchemaFieldBindings";
import injectSchemaTypeBindings from "./injectSchemaTypeBindings";
import injectLensObjects from "./injectLensObjects";

/*
 * Creates the Valaa introspection object.
**/
export default function createValaaObject (engine: any, head: any, rootScope: any,
    hostObjectDescriptors: any, schema: any) {
  const Valaa = {
    beautify: beaumpify,
    toVAKON,
    Primitive: ValaaPrimitive,
  };
  injectLensObjects(Valaa, rootScope, hostObjectDescriptors);
  createTopLevelSymbolAliases(Valaa, Valaa.Lens);

  injectSchemaTypeBindings(Valaa, engine, head, rootScope);

  if (schema) injectSchemaFieldBindings(Valaa, hostObjectDescriptors, schema);
  return Valaa;
}
