// @flow

import { GraphQLSchema } from "graphql/type";

import extendObject from "~/valaa-engine/ValaaSpace/Object";
import extendValaa from "~/valaa-engine/ValaaSpace/Valaa";

import globalEcmaScriptBuiltinObjects from "./globalEcmaScriptBuiltinObjects";
import globalValaaScriptBuiltinObjects from "./globalValaaScriptBuiltinObjects";

export default function extendValaaSpace (globalScope: Object,
    hostObjectDescriptors: Map<any, Object>, schema?: GraphQLSchema) {
  /**
   * Set the globals
   */
  Object.assign(globalScope, globalEcmaScriptBuiltinObjects);
  Object.assign(globalScope, globalValaaScriptBuiltinObjects);

  extendValaa(globalScope, hostObjectDescriptors, schema);
  extendObject(globalScope, hostObjectDescriptors, globalScope.Valaa);
  return globalScope.Valaa;
}
