// @flow

import MediaDecoder from "~/valaa-tools/MediaDecoder";

export default class JSONDecoder extends MediaDecoder {
  static mediaTypes = [
    { type: "application", subtype: "json" },
  ];

  decode (buffer: ArrayBuffer): any {
    return JSON.parse(this.stringFromBuffer(buffer));
  }
}
