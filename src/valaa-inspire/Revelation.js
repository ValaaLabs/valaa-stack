// @flow

import { dumpObject, isPromise, request, wrapError } from "~/valaa-tools";

// Revelation is a JSON object for which any expected sub-object can be replaced with an XHR
// reqwest option object, identified by the presence of key 'url': { url: "..." }.
// The consumers of the Revelation will lazily (or never) asynchronously request such an object
// via awaiting on the corresponding property.
//
// Only properties which have a template value set can be deferred this way.
//
// As an example, the inspire revelation.buffers looks like:
// ```
// {
//   "somebobcontenthash": { "base64": "v0987c1r1bxa876a8s723f21=" },
//   "otherblobcontenthash": { "base64": "b7b98q09au2322h3f2j3hf==" },
//   "thirdcontenthash": { "url": http://url.com/to/buffer52" },
// }
// ```
// And the corresponding buffer template in revelation.template.js:
// ```
//   buffers: dictionaryOf({ base64: "" }),
// ```
//
// TODO(iridian): Figure if exposed string content could be wrapped inside a wrapper, ie. if in
// above base the http://url.com/to/blob52 resolves to string content (not as a JSON object with
// "base64" field), it might be useful if by convention only JSON objects were resolved directly,
// but flat text and any other content was automatically wrapped inside an object, possibly also
// containing encoding and other XHR response information.

export type Revelation = any;

// If given object is a string uses it as the URL for an XHR request and returns the response,
// otherwise returns the given object itself.
export function expose (object: Revelation) {
  return typeof object === "function" ? object()
      : ((typeof object === "object") && (Object.keys(object).length === 1) && object[""])
          ? request({ url: object })
      : object;
}

export const EntryTemplate = Symbol("EntryTemplate");

export function dictionaryOf (valueTemplate: any) {
  const ret = {};
  ret[EntryTemplate] = valueTemplate;
  return ret;
}

export function arrayOf (entryTemplate: any) {
  const ret = [];
  ret[EntryTemplate] = entryTemplate;
  return ret;
}

/**
 * Combines several revelations together, performing a lazy deep merge which resolves promises,
 * merges objects, concatenates arrays and replaces functions with their result values.
 *
 * @export
 * @param {*} revelation
 * @param {...any} extensionSets
 * @returns
 */
export function combineRevelationsLazily (...revelations: any) {
  return _keepCalling(_combineRevelationsLazily(...revelations));
}

function _combineRevelationsLazily (...revelations: any) {
  return revelations.reduce(
      (current, extension) => ((isPromise(current) || isPromise(extension))
          ? (async () => _keepCalling(_extendRevelation(await current, await extension)))
          : _extendRevelation(current, extension)));
}

function _keepCalling (callMeMaybe: Function | any): any {
  return (typeof callMeMaybe === "function") ? _keepCalling(callMeMaybe())
      : isPromise(callMeMaybe) ? callMeMaybe.then(_keepCalling)
      : callMeMaybe;
}

function _extendRevelation (base: Object, extension: Object) {
  let key;
  let ret;
  try {
    if (typeof extension === "undefined") return (ret = base);
    if ((typeof base === "undefined") || (extension === null)) return (ret = extension);
    if ((typeof base === "function") || (typeof extension === "function")) {
      return (ret = () => _combineRevelationsLazily(_keepCalling(base), _keepCalling(extension)));
    }
    if (typeof extension === "object" && extension.url) {
      return (ret = () => _combineRevelationsLazily(base, request(extension)));
    }
    if (base === null) return (ret = extension);

    const baseType = Array.isArray(base) ? "array" : typeof base;
    const extensionType = Array.isArray(extension) ? "array" : typeof extension;
    if (baseType !== extensionType) {
      throw new Error(`Revelation type mismatch: trying to override an entry of type '${
          baseType}' with a value of type '${extensionType}'`);
    }
    if (typeof base !== "object") return (ret = extension);

    const valuePrototype = base[EntryTemplate];

    if (Array.isArray(base)) {
      if (!valuePrototype) return (ret = [].concat(base, extension));
      ret = [].concat(base);
      for (const entry of [].concat(extension)) {
        const combined = _combineRevelationsLazily(valuePrototype, entry);
        key = ret.length;
        ret.push(combined);
        if (typeof combined === "function") {
          _setPropertyToGetter(ret, key, combined);
        }
      }
      return ret;
    }
    ret = Object.create(Object.getPrototypeOf(base), Object.getOwnPropertyDescriptors(base));
    for (const [key_, value] of Object.entries(extension)) {
      key = key_;
      const currentValue = typeof ret[key] !== "undefined" ? ret[key] : valuePrototype;
      if (typeof currentValue === "undefined") {
        ret[key] = value;
      } else {
        const combined = _combineRevelationsLazily(currentValue, value);
        if (typeof combined !== "function") {
          ret[key] = combined;
        } else {
          _setPropertyToGetter(ret, key, combined);
        }
      }
    }
    return ret;
  } catch (error) {
    throw wrapError(error, "During _extendRevelation(), with:",
        "\n\tbase revelation:", ...dumpObject(base),
        "\n\textension revelation:", ...dumpObject(extension),
        ...(key ? ["\n\tresult key:", key] : []));
  } /* finally {
    console.log("extended, with:",
        "\n\tbase revelation:", ...dumpObject(base),
        "\n\textension revelation:", ...dumpObject(extension),
        "\n\tresult:", ret);
  }*/
}

function _setPropertyToGetter (target: any, key: number | string, getter: Function) {
  let value;
  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get () {
      if (typeof value !== "undefined") return value;
      value = _keepCalling(getter);
      Object.defineProperty(target, key, { value, writable: true });
      Promise.resolve(value).then(resolvedValue => {
        value = resolvedValue;
        Object.defineProperty(target, key, { value, writable: true });
      });
      return value;
    }
  });
}
