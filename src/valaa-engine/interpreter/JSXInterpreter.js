// @flow
import React from "react";

import VALEK, { Kuery, EngineKuery, VS, VALKOptions } from "~/valaa-engine/VALEK";
import { addStackFrameToError, SourceInfoTag } from "~/valaa-core/VALK/StackTrace";

// FIXME(iridian): Removes cross-dependency to valaa-inspire
import { LENS } from "~/valaa-inspire/ui/base/UIComponent";
import Vrapper from "~/valaa-engine/Vrapper";
import vidgets from "~/valaa-inspire/ui/vidget";
import jsxTransformFromString from "~/valaa-engine/interpreter/jsxTransformFromString";

import notThatSafeEval from "~/valaa-tools/notThatSafeEval";

import MediaInterpreter from "~/valaa-engine/interpreter/MediaInterpreter";

export default class JSXInterpreter extends MediaInterpreter {
  static recognizedMediaType = { type: "text", subtype: "jsx" };
  static columnOffset = 0;

  interpret (content: any, vScope: Vrapper, mediaInfo: Object, options?: VALKOptions): any {
    let transpiledSource;
    if (!content) return null;
    let sourceInfo;
    try {
      const partitionName = this._getPartitionDebugName(vScope, options);
      sourceInfo = {
        partitionName,
        mediaName: mediaInfo.name,
        mediaInfo,
        content,
        phaseBase: `${mediaInfo.type}/${mediaInfo.subtype} "${mediaInfo.name}"@"${partitionName}"`,
        phase: undefined,
        sourceMap: new Map(),
      };
      sourceInfo.phase = `jsx-transform phase of ${sourceInfo.phaseBase}`;
      transpiledSource = jsxTransformFromString(content,
          this._getJSXTransformOptions({ enableSourceInfo: true }));
      const scope = this._createScope(vScope, sourceInfo);
      sourceInfo.phase = `integration phase of ${sourceInfo.phaseBase}`;
      const evalResult = notThatSafeEval(scope, `return ${transpiledSource}`);
      sourceInfo.phase = `run phase of ${sourceInfo.phaseBase}`;
      return evalResult;
    } catch (error) {
      const wrappedError = vScope.wrapErrorEvent(error,
          `${this.constructor.name}.interpret("${mediaInfo.name}"):`,
          "\n\tsourceInfo:", sourceInfo);
      if (!sourceInfo || !error.column || !error.lineNumber) throw wrappedError;
      const loc = {
        start: { line: error.lineNumber, column: error.column - 1 }, // 3?
        end: { line: error.lineNumber, column: error.column },
      };
      const sourceDummy = {};
      sourceInfo.sourceMap.set(sourceDummy, { loc });
      throw addStackFrameToError(wrappedError, sourceDummy, sourceInfo);
    }
  }

  _getJSXTransformOptions ({ enableSourceInfo }: Object = {}): Object {
    const ret = {
  //        factory: "() => createElement",
      factory: "createElement",
      spreadFn: "spread",
      unknownTagsAsString: false,
      passUnknownTagsToFactory: true,
      transformExpressionText: undefined,
    };
    if (enableSourceInfo) {
      ret.transformExpressionText = (text: any, start: { line?: number, column?: number } = {},
          end: { line?: number, column?: number } = {}) =>
              `addSourceInfo(${text}, ${start.line}, ${start.column}, ${end.line}, ${end.column})`;
    }
    return ret;
  }

  _createScope (vScope: Vrapper, sourceInfo: Object) {
    const ret = {
      ...vidgets,
      ...vScope.getLexicalScope(),
      children: null,
      LENS,
      VS,
      VALK: VALEK,
      createElement: React.createElement,
      addSourceInfo: (inlineContent, startLine, startColumn, endLine, endColumn) =>
        this._addSourceInfo(inlineContent, sourceInfo,
            { line: startLine, column: startColumn }, { line: endLine, column: endColumn }),
        // Non-object blockValues lack identity and cannot have any source info associated with them
      spread: (...rest) => Object.assign(...rest),
      kueryTag: (strings, ...values) => (origHead: ?any) => {
        let strBuilder = "";
        for (const [index, str] of strings.entries()) {
          const val = values[index];
          strBuilder += str;
          if (val) strBuilder += typeof val === "function" ? val(origHead) : val;
        }
        return strBuilder;
      },
      get: (kuery: EngineKuery = VALEK.head()) =>
          ((kuery instanceof Kuery) ? kuery : VALEK.to(kuery)),
      kuery: (kuery: EngineKuery = VALEK.head()) =>
          ({ kuery: (kuery instanceof Kuery) ? kuery : VALEK.to(kuery) }),
      event: (eventName: string, { emit = eventName, target = VALEK.fromScope("lensHead") }
          = {}) => ({ [eventName]: target.propertyValue(emit) }),
    };
    delete ret.this;
    return ret;
  }

  _addSourceInfo (inlineContent: any, outerSourceInfo: Object, start: Object, end: Object) {
    if (typeof inlineContent !== "object" || inlineContent === null) return inlineContent;
    if (!(inlineContent instanceof Kuery)) {
      const entries = Array.isArray(inlineContent) ? inlineContent
          : (Object.getPrototypeOf(inlineContent) === Object.prototype)
              ? Object.values(inlineContent)
              : [];
      entries.forEach(subContent => this._addSourceInfo(subContent, outerSourceInfo, start, end));
      return inlineContent;
    }
    const sourceInfo: any = inlineContent[SourceInfoTag];
    if (!sourceInfo) {
      outerSourceInfo.sourceMap.set(inlineContent.toVAKON(), { loc: { start, end, } });
    } else {
      for (const [key, entry] of sourceInfo.sourceMap) {
        const loc = { start: { ...entry.loc.start }, end: { ...entry.loc.end } };
        if (loc.start.line === 1) {
          loc.start.column += start.column + this.constructor.columnOffset;
        }
        if (loc.end.line === 1) loc.end.column += start.column + this.constructor.columnOffset;
        loc.start.line += start.line - 1;
        loc.end.line += start.line - 1;
        outerSourceInfo.sourceMap.set(key, { ...entry, loc });
      }
    }
    inlineContent[SourceInfoTag] = outerSourceInfo;
    return inlineContent;
  }
}
