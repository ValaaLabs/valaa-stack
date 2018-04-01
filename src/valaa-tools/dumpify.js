/**
 *  Returns debug dump of a value as a string, including its type.
 *  @param value the string to dumpify
 *  @param sliceAt the max length of the dump string
 *  @param sliceSuffix the suffix appended to the dump if it got sliced
 */
export default function dumpify (value, sliceAt, sliceSuffix = "", cache = new Map()) {
  let ret;
  function decirculator (key, innerValue) {
    if (typeof innerValue === "object" && innerValue !== null) {
      const cacheIndex = cache.get(innerValue);
      if (typeof cacheIndex !== "undefined") {
        // Circular reference found, discard key
        return `<circular/duplicate ref #${cacheIndex}>`;
      }
      // Store value in our collection
      cache.set(innerValue, cache.size + 1);
      if (innerValue.toDumpify) return innerValue.toDumpify(cache);
    }
    if (typeof innerValue === "function") return innerValue.toString();
    return innerValue;
  }
  if (typeof value === "function") ret = `[function ${value.name}()]`;
  else if (typeof value === "object" && value) {
    const cacheIndex = cache.get(value);
    if (typeof cacheIndex !== "undefined") return `<circular/duplicate ref #${cacheIndex}>`;
    if (value.toDumpify) return value.toDumpify(cache);
    ret = `${value.constructor ? `${value.constructor.name} ` : ""}${
        JSON.stringify(value, decirculator)}`;
    const proto = Object.getPrototypeOf(value);
    if (proto) {
      const suffix = proto.constructor
          ? `:${proto.constructor.name}`
          : `->${dumpify(proto, undefined, undefined, cache)}`;
      ret += suffix;
    }
  } else if (typeof value === "string") ret = value;
  else if (typeof value === "symbol") ret = value.toString();
  else ret = JSON.stringify(value, decirculator);
  if (sliceAt && ret && (sliceAt < ret.length)) return `${ret.slice(0, sliceAt)}${sliceSuffix}`;
  return ret;
}
