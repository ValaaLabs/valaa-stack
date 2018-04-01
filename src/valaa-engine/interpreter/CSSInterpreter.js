import css from "jss-css/lib/css";

import MediaInterpreter from "~/valaa-engine/interpreter/MediaInterpreter";

export default class CSSInterpreter extends MediaInterpreter {
  canInterpret (mediaType: { type: string, subtype: string }): boolean {
    return mediaType.subtype === "css";
  }
  interpret (content: any): any {
    return css `${content}`;
  }
}
