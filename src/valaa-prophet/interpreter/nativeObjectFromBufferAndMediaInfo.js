// @flow

import { stringFromUTF8ArrayBuffer } from "~/valaa-tools/id/contentId";

export default function nativeObjectFromBufferAndMediaInfo (buffer: ArrayBuffer, mediaInfo?:
    { type?: string, subtype?: string, name?: string
  /* TODO(iridian): any other types we'd need for
    https://html.spec.whatwg.org/multipage/parsing.html#determining-the-character-encoding ?
  */ }) {
  // TODO(iridian): This is a quick hack for common types: we should really obey the above practice.
  if (!mediaInfo) return buffer;
  if (_isTextType(mediaInfo)) {
    const text = stringFromUTF8ArrayBuffer(buffer);
    if (mediaInfo.subtype === "json") return JSON.parse(text);
    return text;
  }
  return buffer;
}

function _isTextType ({ type, subtype }: { type: string, subtype: string }) {
  if (type === "text") return true;
  if (type === "application") return _applicationTextSubtypes[subtype];
  return false;
}

const _applicationTextSubtypes: any = {
  valaascript: true,
  "x-javascript": true,
  javascript: true,
  ecmascript: true,
  vsx: true,
  jsx: true,
};
