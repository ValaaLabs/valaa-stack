// @flow

import { request } from "~/valaa-tools";

// Revelation is a JSON object for which any expected sub-object can be replaced with an XHR request
// url. This is called an 'opaque' object. The consumers of the Revelation will lazily (or never)
// asynchronously request the exposure of such opaque objects.
//
// Note: this means that direct string content must either always be opaque (clients always
// exposes its contents) or never be opaque (consumer doesn't expose the content).
// As an example, the inspire revelation.buffers looks like:
// ```
// {
//   "somebobcontenthash": { "base64": "v0987c1r1bxa876a8s723f21=" },
//   "otherblobcontenthash": { "base64": "b7b98q09au2322h3f2j3hf==" },
//   "thirdcontenthash": "http://url.com/to/blob52",
// }
// ```
// TODO(iridian): Figure if exposed string content could be wrapped inside a wrapper, ie. if in
// above base the http://url.com/to/blob52 resolves to string content (not as a JSON object with
// "base64" field), it might be useful if by convention only JSON objects were resolved directly,
// but flat text and any other content was automatically wrapped inside an object, possibly also
// containing encoding and other XHR response information.

export type Revelation = string | any;

// If given object is a string uses it as the URL for an XHR request and returns the response,
// otherwise returns the given object itself.
export function expose (object: Revelation) {
  if (typeof object === "function") return object();
  if (typeof object !== "string") return object;
  return request({ url: object });
}
