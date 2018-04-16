// @flow
import crypto from "crypto";
import type Stream from "stream";
import JsSHA from "jssha";
import { TextEncoder, TextDecoder } from "text-encoding";

// FIXME(iridian): This needs to be properly tested, especially on the surrogate pairs an aether
// planes, so that UCS2String and UCS2Stream give identical results!

export function bufferAndContentIdFromNative (object: any, mediaInfo?: Object) {
  if (typeof object === "undefined") return undefined;
  const ret = {
    buffer: (typeof object === "string") ? _arrayBufferFromStringAndMediaInfo(object, mediaInfo)
        : (ArrayBuffer.isView(object)) ? object.buffer
        : (object instanceof ArrayBuffer) ? object
        : _arrayBufferFromStringAndMediaInfo(JSON.stringify(object), mediaInfo),
    contentId: undefined,
  };
  ret.contentId = contentIdFromArrayBuffer(ret.buffer);
  return ret;
}

function _arrayBufferFromStringAndMediaInfo (text: string, mediaInfo?: Object) {
  if (!mediaInfo) return utf8ArrayBufferFromString(text);
  // TODO(iridian): Implement mediaInfo encoding schemas eventually.
  // Now storing everything as utf8 which is maybe not what we want: it thrashes save/load
  // roundtrips for documents whose original encoding is not utf8.
  return utf8ArrayBufferFromString(text);
}

export function stringFromUTF8ArrayBuffer (buffer: ArrayBuffer): string {
  return _stringFromArrayBuffer("utf-8", buffer);
}

export function stringFromUTF16LEArrayBuffer (buffer: ArrayBuffer): string {
  return _stringFromArrayBuffer("utf-16le", buffer);
}

export function stringFromUTF16BEArrayBuffer (buffer: ArrayBuffer): string {
  return _stringFromArrayBuffer("utf-16be", buffer);
}

function _stringFromArrayBuffer (encoding: string, buffer: ArrayBuffer): string {
  const enc = new TextDecoder(encoding);
  return enc.decode(new Uint8Array(buffer));
}

export function utf8ArrayBufferFromString (stringContent: string): ArrayBuffer {
  return _arrayBufferFromString("utf-8", stringContent);
}

export function utf16LEArrayBufferFromString (stringContent: string): ArrayBuffer {
  return _arrayBufferFromString("utf-16le", stringContent);
}

export function utf16BEArrayBufferFromString (stringContent: string): ArrayBuffer {
  return _arrayBufferFromString("utf-16be", stringContent);
}

function _arrayBufferFromString (encoding: string, stringContent: string): ArrayBuffer {
  const enc = new TextEncoder(encoding);
  return enc.encode(stringContent).buffer;
}

export function contentIdFromArrayBuffer (buffer: ArrayBuffer): string {
  const sha = new JsSHA("SHA-512", "ARRAYBUFFER");
  sha.update(buffer);
  return sha.getHash("HEX");
}

export function contentIdFromUCS2String (contentString: string) {
  const buffer = utf8ArrayBufferFromString(contentString);
  return contentIdFromArrayBuffer(buffer);
}

/*
  Returns a promise that resolves with the sha512 hash of the content of the given stream.
*/
export function contentIdFromNativeStream (contentStream: Stream): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash("sha512");
      contentStream.on("end", () => {
        hash.end();
        const digest = hash.read();
        if (digest) {
          resolve(digest.toString("hex"));
        } else {
          reject("Could not resolve digest for stream");
        }
      });
      contentStream.pipe(hash);
    } catch (err) {
      reject(err);
    }
  });
}
