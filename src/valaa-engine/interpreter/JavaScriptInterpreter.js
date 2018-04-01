import MediaInterpreter from "~/valaa-engine/interpreter/MediaInterpreter";
import importFromString from "~/valaa-engine/interpreter/importFromString";

export default class JavaScriptInterpreter extends MediaInterpreter {
  canInterpret (mediaType: { type: string, subtype: string }): boolean {
    return mediaType.type === "application" && mediaType.subtype === "javascript";
  }
  interpret (content: any, vScope?: Object): any {
    const result = importFromString(content, vScope && vScope.getHostGlobal());
    return result.exports;
  }
}
