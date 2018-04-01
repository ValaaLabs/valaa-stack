// @flow

import { transpileValaaScriptModule, addExportsContainerToScope } from "~/valaa-script";

import MediaInterpreter from "~/valaa-engine/interpreter/MediaInterpreter";
import VALEK from "~/valaa-engine/VALEK";

import Vrapper from "~/valaa-engine/Vrapper";
import type { VALKOptions } from "~/valaa-core/VALK";
import { dumpObject } from "~/valaa-tools";

export default class ValaaScriptInterpreter extends MediaInterpreter {
  canInterpret (mediaType: { type: string, subtype: string }): boolean {
    return mediaType.type === "application" && mediaType.subtype === "valaascript";
  }
  interpret (content: any, vScope: Vrapper, mediaInfo: Object, options: VALKOptions = {}): any {
    const sourceInfo = {
      phase: `ValaaScript Media "${mediaInfo.name}" as VALK module transpilation`,
      partitionName: this._getPartitionDebugName(vScope, options),
      mediaName: mediaInfo.name,
      content,
      sourceMap: new Map(),
    };
    const moduleKuery = transpileValaaScriptModule(content, { sourceInfo, customVALK: VALEK });
    const scopeName = vScope.hasInterface("Discoverable")
        && vScope.get("name", Object.create(options));
    const scopeDescriptor = scopeName ? `in Scope "${scopeName}"` : "in unnamed Scope";
    sourceInfo.phase = `ValaaScript module "${mediaInfo.name}" integration ${scopeDescriptor}`;
    options.scope = Object.create(vScope.getLexicalScope());
    const moduleExports = addExportsContainerToScope(options.scope);
    options.scope.require = require;
    const ret = vScope.get(moduleKuery, Object.create(options));
    // Any function captures by the vScope.get will hold the Valker and thus sourceInfo, and use its
    // phase information during subsequent calls. Update it to "runtime".
    sourceInfo.phase = `VALK runtime (within VS module "${mediaInfo.name}" ${scopeDescriptor})`;
    if (!Object.keys(moduleExports).length) {
      // TODO(iridian): This feels a bit shady, maybe the transpileValaaScriptModule could tell us
      // if there were no exports in the module?
      moduleExports.default = ret;
    }
    return moduleExports;

    function require (importPath: string) {
      let steps;
      let head = vScope;
      let nextHead;
      let i = 0;
      try {
        steps = importPath.split("/");
        const scopeKey = steps[0];
        if ((scopeKey !== ".") && (scopeKey !== "..")) {
          nextHead = head.get(VALEK.identifierValue(scopeKey), Object.create(options));
          if (steps.length === 1) return nextHead;
          if (!(nextHead instanceof Vrapper)) {
            throw new Error(`Could not find a Resource at initial import scope lookup for '${
                scopeKey}' (with path "${steps.slice(1).join("/")}" still remaining)`);
          }
          head = nextHead;
          i = 1;
        } // else as the first step is either "." or ".." just start from beginning with i === 0
        for (; i + 1 /* terminate one before end */ < steps.length; ++i) {
          const ownlingName = steps[i];
          if (ownlingName === ".") continue;
          if (ownlingName === "..") {
            nextHead = head.get(VALEK.toField("owner"), Object.create(options));
            if (!(nextHead instanceof Vrapper)) {
              throw new Error(`Could not find an owner Resource at import step '..' (with path "${
                  steps.slice(i).join("/")}" still remaining)`);
            }
          } else {
            nextHead = head.get(VALEK.toField("unnamedOwnlings")
                    .filter(VALEK.isOfType("Entity").and(VALEK.hasName(ownlingName))).toIndex(0),
                Object.create(options));
            if (!(nextHead instanceof Vrapper)) {
              throw new Error(`Could not find an ownling Entity at import step '${ownlingName
                  }' (with path "${steps.slice(i).join("/")}" still remaining)`);
            }
          }
          head = nextHead;
        }
        const mediaOrPropertyName = steps[steps.length - 1];
        nextHead = head.get(VALEK.toField("unnamedOwnlings")
                .filter(VALEK.isOfType("Media").and(VALEK.hasName(mediaOrPropertyName))).toIndex(0),
            Object.create(options));
        if (nextHead) {
          return nextHead.extractValue(Object.create(options), head);
        }
        nextHead = head.get(VALEK.propertyValue(mediaOrPropertyName), Object.create(options));
        if ((nextHead instanceof Vrapper)
            && (nextHead.getTypeName(Object.create(options)) === "Media")) {
          // can't provide head as explicit owner as the property might refer outside of the head.
          return nextHead.extractValue(options);
        }
        return nextHead;
      } catch (error) {
        throw vScope.wrapErrorEvent(error, `require("${importPath}")`,
            "\n\tcurrent head:", ...dumpObject(head),
            "\n\tcurrent step:", steps[i],
            "\n\tnext head candidate:", ...dumpObject(nextHead),
            "\n\tscope resource:", ...dumpObject(vScope),
        );
      }
    }
  }
}
