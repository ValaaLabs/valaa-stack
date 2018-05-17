// @flow

import MediaDecoder from "~/tools/MediaDecoder";

export default class PlainTextDecoder extends MediaDecoder {
  static mediaTypes = [
    { type: "text", subtype: "plain" },
    { type: "text" },
  ];

  decode (buffer: ArrayBuffer): string {
    return this.stringFromBuffer(buffer);
  }
}
