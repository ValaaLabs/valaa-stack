// @flow

export default function getGlobal () {
  return (typeof window !== "undefined") ? window
    : (typeof global !== "undefined") ? global
    : (typeof self !== "undefined") ? self
    : ((() => { throw new Error("Cannot determine global object"); })());
}
