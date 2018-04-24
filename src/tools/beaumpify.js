import dumpify from "~/tools/dumpify";

// const beautify = require("js-beautify").js_beautify;

/**
 * dumpify wrapped in beautify
 *
 * @export
 * @param {any} value
 * @param {any} sliceAt
 * @param {any} sliceSuffix
 * @returns
 */
export default function beaumpify (value, { slice, sliceSuffix } = {}) {
  return dumpify(value, slice, sliceSuffix);
  // return dumpified ? beautify(dumpified, { ...beautifyOptions }) : "undefined";
}
