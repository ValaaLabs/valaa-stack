// @flow

import { GraphQLSchema } from "graphql/type";

import type ValaaEngine from "~/valaa-engine/ValaaEngine";
import Vrapper from "~/valaa-engine/Vrapper";
import VALEK from "~/valaa-engine/VALEK";

import createObject from "~/valaa-engine/ValaaSpaceAPI/Object";
import createValaa from "~/valaa-engine/ValaaSpaceAPI/Valaa";

import globalEcmaScriptBuiltinObjects from "./globalEcmaScriptBuiltinObjects";
import globalHTML5BuiltinObjects from "./globalHTML5BuiltinObjects";
import globalValaaScriptBuiltinObjects from "./globalValaaScriptBuiltinObjects";

export default function injectScriptAPIToScope (head: Vrapper, scope: Object,
    hostObjectDescriptors: Map<any, Object>, engine: Object, schema?: GraphQLSchema) {
  /**
   * Set the globals
   */
  Object.assign(scope, globalEcmaScriptBuiltinObjects);
  Object.assign(scope, globalHTML5BuiltinObjects);
  Object.assign(scope, globalValaaScriptBuiltinObjects);

  scope.event = (eventName,
      { emit = eventName, target = VALEK.fromScope("lensHead"), data = {} } = {}) => {
    console.error("DEPRECATED: (global scope) 'event'\n\tprefer: direct VS functions",
        "\n\teventName:", eventName,
        "\n\temitted name:", emit);
    valaaScriptEvent(engine, head, target, undefined, emit, data);
  };

  scope.Valaa = createValaa(engine, head, scope, hostObjectDescriptors, schema);
  scope.Object = createObject(scope.Valaa, hostObjectDescriptors);
}

export function valaaScriptEvent (engine: ValaaEngine, head: any, target: any,
    customScope: ?Object, eventName: string, eventData: any) {
  const vHead = getVrapperFor(head, engine);
  const targetVrapper = target.constructor.name === "Vrapper"
      ? target
      : vHead.get(VALEK.to(target), { scope: customScope || vHead.getLexicalScope() });

  const listeners = targetVrapper.get(VALEK.to("listeners").filter(
    VALEK.if(VALEK.to("condition"),
      {
        then: VALEK.evalk(VALEK.to("condition").to("asVAKON")).equalTo(eventName),
        else: VALEK.to("name").equalTo(eventName)
      }
    )
  ), { scope: customScope || targetVrapper.getLexicalScope() });

  const eventScope = eventToScope(eventData);
  for (const listener of listeners) {
    const action = listener.get("action");
    targetVrapper.do(action.get("asVAKON"), { scope: eventScope });
  }
}

// FIXME: relying on _properties is bad, should be a way to convert maps to vrappers via engine
function getVrapperFor (owner, engine) {
  return owner instanceof Vrapper
      ? owner
      : engine.getVrapper(owner._stub ? owner._stub.get("id") : owner._singular.get("id"));
}

function eventToScope (eventData) {
  const scopeEvent = {};
  for (const eventField of Object.keys(eventData)) {
    if (eventField[0] === "_" || eventField === "nativeEvent" || !eventData[eventField]) continue;
    const type = eventData[eventField].constructor.name;
    if (type === "Function") continue;

    switch (type) {
      case "HTMLInputElement":
        scopeEvent.eventValue = eventData[eventField].value;
        break;
      default:
        scopeEvent[eventField] = eventData[eventField];
        break;
    }
  }
  return scopeEvent;
}
