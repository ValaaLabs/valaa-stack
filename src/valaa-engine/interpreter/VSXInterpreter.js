// @flow

import { addStackFrameToError } from "~/valaa-core/VALK/StackTrace";

import JSXInterpreter from "~/valaa-engine/interpreter/JSXInterpreter";
import VALEK from "~/valaa-engine/VALEK";

import { transpileValaaScript } from "~/valaa-script";

import { wrapError } from "~/valaa-tools";

export default class VSXInterpreter extends JSXInterpreter {
  static recognizedMediaType = { type: "text", subtype: "vsx" };
  static columnOffset = -1;

  _getJSXTransformOptions (options: Object): Object {
    const ret = super._getJSXTransformOptions(options);
    if (options.enableSourceInfo) {
      ret.transformExpressionText = (text: any, start: any = {}, end: any = {}) =>
          `addSourceInfo(\`(${text.replace(/(\\|`)/g, "\\$1")})\`, ${
              start.line}, ${start.column}, ${end.line}, ${end.column})`;
    }
    return ret;
  }

  _addSourceInfo (bodyText: any, topLevelSourceInfo: Object, start: Object, end: Object) {
    const sourceInfo = Object.create(topLevelSourceInfo);
    try {
      sourceInfo.phase = `inline VS transpilation at ${start.line}:${start.column} in ${
          sourceInfo.phaseBase}`;
      sourceInfo.sourceMap = new Map();
      const bodyKuery = transpileValaaScript(bodyText, VALEK, { sourceInfo, sourceType: "body" });
      sourceInfo.phase = `inline VS run at ${start.line}:${start.column} in ${
          sourceInfo.phaseBase}`;
      return super._addSourceInfo(bodyKuery, sourceInfo, start, end);
    } catch (error) {
      const sourceDummy = {};
      sourceInfo.sourceMap.set(sourceDummy, { loc: { start, end } });
      throw addStackFrameToError(
          wrapError(error, `During inline VS transpilation in VSX "${sourceInfo.name}"/"${
                  sourceInfo.partitionName}"`,
              "\n\tsourceInfo:", sourceInfo),
          sourceDummy, sourceInfo);
    } finally {
      for (const entry of sourceInfo.sourceMap) topLevelSourceInfo.sourceMap.set(...entry);
    }
  }
}

