/**
 * SimpleData is a base class for trivial data objects which still have a named typed
 * to facilitate flow type analysis and general readability.
 * Its default constructor just distributes given params to be members of the object.
 * Its implementations should add member declarations using flow syntax.
 *
 * TODO(iridian): Add a mechanism for flow to recognize constructor params and validate them against
 * the declared member fields of the fully derived data objects.
 *
 * @export
 * @class SimpleData
 */
export default class SimpleData {
  constructor (params) {
    for (const key of Object.keys(params || {})) {
      this[key] = params[key];
    }
  }
}
