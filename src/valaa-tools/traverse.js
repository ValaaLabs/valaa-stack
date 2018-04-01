/**
 * Traverses a path from given root object through its member fields to a sub-object or leaf.
 * @param root {object} the sub-object traversal starting point
 * @param path {string} the dot-separated path of field names.
 * @param path {array}, path as array of field names. An array entry can be either a field name
 * string or a [string, number] pair, representing an expanded array index.
 */

export default function traverse (object, path) {
  const keys = Array.isArray(path) ? path : path.split(".");
  return keys.reduce((innerObject, key) => innerObject && innerObject[key], object);
}
