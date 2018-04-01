import MediaInterpreter from "~/valaa-engine/interpreter/MediaInterpreter";

export default class PlainTextMediaInterpreter extends MediaInterpreter {
  canInterpret (mediaType: { type: string, subtype: string }): boolean {
    return mediaType.type === "text" && mediaType.subtype === "plain";
  }
  interpret (content: any): any {
    return content;
  }
}
