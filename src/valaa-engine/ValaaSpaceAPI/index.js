// @flow

import { GraphQLSchema } from "graphql/type";

import createObject from "~/valaa-engine/ValaaSpaceAPI/Object";
import createValaa from "~/valaa-engine/ValaaSpaceAPI/Valaa";

import globalEcmaScriptBuiltinObjects from "./globalEcmaScriptBuiltinObjects";
import globalHTML5BuiltinObjects from "./globalHTML5BuiltinObjects";
import globalValaaScriptBuiltinObjects from "./globalValaaScriptBuiltinObjects";

export default function injectScriptAPIToScope (scope: Object,
    hostObjectDescriptors: Map<any, Object>, schema?: GraphQLSchema) {
  /**
   * Set the globals
   */
  Object.assign(scope, globalEcmaScriptBuiltinObjects);
  Object.assign(scope, globalHTML5BuiltinObjects);
  Object.assign(scope, globalValaaScriptBuiltinObjects);

  scope.Valaa = createValaa(scope, hostObjectDescriptors, schema);
  scope.Object = createObject(scope.Valaa, hostObjectDescriptors);
  return scope.Valaa;
}
