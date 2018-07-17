// @flow

/**
 * Deep extends the given mutable target with the given immutable source value like a recursive
 * generalization of the es6 spread operation.
 *
 * Additionally deepExtend introduces the *spread operation* and the *spreader properties*.
 * As first class properties (default key "...") these spreader properties can be used to /describe/
 * localized, lazily evaluated, and context-dependent deep extend operations as persistent,
 * fully JSON-compatible data.
 *
 * The idiomatic example is shared JSON configurations (similar to babel presets or eslint extends):
 *
 * Given two JSON files:
 * // common.json
 * `{ kind: "project", name: "unnamed", plugins: ["basicplugin"] }`
 * // myproject.json
 * `{ "...": "./common.json", name: "myproject", plugins: ["myplugin"] }`
 *
 * When myproject.json is deep-extended onto {} (with the contextual configSpread callback)
 * `deepExtend({}, myProjectJSON, { spread: configSpread });`
 * the result equals `{ kind: "project", name: "myproject", plugins: ["basicplugin", "myplugin"] }`.
 *
 * The configSpread callback interprets the "./common.json" spreader value as a file read operation.
 * deepExtend then appends the result of that onto {} followed by the rest of myProjectJSON.
 *
 *
 * Deep extend has two semantics: the universal deep extend semantics and the spread semantics.
 *
 * Deep extend semantics depend only on the source value type:
 * Empty object and undefined source values are no-ops and return the target unchanged.
 * Arrays in-place append and plain old objects in-place update the target value and return the
 * mutated target value. All other source values are returned directly.
 * If target of an in-place operation is not of an appropriate type a new empty object or array is
 * created as the target and returned after sub-operations.
 * Update performs a sub-deep-assign for each enumerable key of the source object. If the return
 * value is not undefined and differs from the corresponding value on the target it is assigned to
 * the target.
 *
 * Examples of deep append:
 *
 * deepExtend({ foo: [1], bar: "a" }, { foo: [2], bar: "b" })          -> { foo: [1, 2], bar: "b" }
 * deepExtend({ foo: [1] }, [{ foo: [2, 3] }, { foo: { 1: 4 } }])      -> { foo: [1, 4, 3] }
 * deepExtend({ foo: [1] }, { foo: null })                             -> { foo: null }
 * deepExtend({ foo: [1] }, [{ foo: null }, { foo: [3] }])             -> { foo: [3] }
 *
 * If a source object of some nested deep append phase has a spreader property (by default "...")
 * then right before it is deep assigned a spread operation is performed:
 * 1. The spread callback is called like so:
 *    const intermediate = spread(source["..."], target, source, key, targetParent,
 *    sourceParent).
 * 2. If the returned intermediate is undefined the subsequent deep assign of the source is skipped
 *    and deep assign returns targetParent[key].
 * 3. Otherwise the intermediate is deep assigned onto the target value, potentially recursively
 *    evaluating further spread operations.
 * 4. Finally the original source object is omitted the spreader property and deep assigned onto
 *    the target value (which has now potentially been much mutated).
 *
 * deepExtend([1, 2, 3], { 1: null })                                  -> [1, null, 3]
 * deepExtend([1, 2, 3], { 1: undefined })                             -> [1, undefined, 3]
 * deepExtend([1, 2, 3], { 1: { "...": null } })                       -> [1, 3]
 *
 *
 * Examples of spreaders:
 *
 * const fooRewriter = { "...": [{ foo: null }, { foo: [3] }] }
 * deepExtend({de:{ep:{ foo: [1] }}}, {de:{ep: fooRewriter }})         -> {de:{ep:{ foo: [3] }}}
 *
 * const arrayRewriter = { "...": [null, [3]] }
 * deepExtend({de:{ep:{ foo: [1] }}}, {de:{ep:{ foo: arrayRewriter }}})-> {de:{ep:{ foo: [3] }}}
 *
 *
 * Elementary merge rules as "lhs ... rhs -> result" productions based on rhs type:
 *
 * rhs: undefined | {}          -> lhs
 * rhs: { "...": spr, ...rest } -> deepExtend(deepExtend(lhs, spr), rest)
 * rhs: Array                   -> asArray(lhs, (ret =>
 *                                     rhs.forEach(e => ret.push(deepExtend(null, [e])))))
 * rhs: Object                  -> asObject(lhs, (ret => Object.keys(rhs).forEach(key =>
 *                                     { ret[key] = deepExtend(ret[key], [rhs[key]]); });
 * rhs: any                     -> rhs
 *
 * @export
 * @param {*} target
 * @param {*} spreadee
 * @param {*} stack
 */
exports.default = function deepExtend (target /* : Object */, spreadee /* : Array<any> */,
    options /* : {
  spreadProperty?: string, spread?: Function, customize?: Function, keyPath?: Array<any>,
}*/) {
  return {
    spreadProperty: "...",
    ...options,
    entrySpread (target_, spreadee_, targetKey, targetContainer, spreadeeContainer) {
      // console.log("entrySpread, targetContainer/key:", targetContainer, targetKey,
      //    "\n\ttarget:", JSON.stringify(target_), "<- spreadee:", spreadee_);
      const result = options.spread && options.spread.call(
          this, target_, spreadee_, targetKey, targetContainer, spreadeeContainer);
      if (result !== undefined) return result;
      const ret = this.spread(target_, spreadee_);
      return !spreadeeContainer ? ret : this.merge(ret, spreadeeContainer);
    },
    spread (target_, spreadee_) {
      if ((spreadee_ === null) || (spreadee_ === undefined)) return undefined;
      if (typeof spreadee_ === "function") return spreadee_(target_);
      if (!Array.isArray(spreadee_)) return this.merge(target_, spreadee_, false);
      let ret = target_;
      for (const entry of spreadee_) {
        ret = this.merge(ret, entry, false);
      }
      return ret;
    },
    merge (lhs, rhs, ignoreSpread = true, lhsKey, lhsContainer, rhsContainer) {
      if (this.customizer) {
        const newValue = this.customizer(lhs, rhs, lhsKey, lhsContainer, rhsContainer, this);
        if (newValue !== undefined) return newValue;
      }
      if (typeof rhs !== "object") return rhs !== undefined ? rhs : lhs;
      if (rhs === null) return null;
      let ret = lhs;
      if (rhs === lhs) throw new Error("Cannot merge to self");
      if (Array.isArray(rhs)) {
        const appendOpKeyPath = this.keyPath && [...this.keyPath, 0];
        if (!Array.isArray(ret)) ret = [];
        for (const re of rhs) {
          if (appendOpKeyPath) {
            (this.keyPath = appendOpKeyPath)[appendOpKeyPath.length - 1] = ret.length;
          }
          const newValue = this.merge(null, re, false, ret.length, ret, rhs);
          if (newValue !== undefined) ret.push(newValue);
        }
        return ret;
      }
      if (!ignoreSpread && this.spreadProperty && rhs.hasOwnProperty(this.spreadProperty)) {
        return this.entrySpread(lhs, rhs[this.spreadProperty], lhsKey, lhsContainer, rhs);
      }
      let spliceCount = Array.isArray(ret) ? 0 : undefined;
      const updateOpKeyPath = this.keyPath && [...this.keyPath, ""];
      for (const key of Object.keys(rhs)) {
        if (key === this.spreadProperty) continue;
        if ((ret === null) || (typeof ret !== "object")) ret = {};
        const retKey = spliceCount === undefined ? key : key - spliceCount;
        if (updateOpKeyPath) (this.keyPath = updateOpKeyPath)[updateOpKeyPath.length - 1] = retKey;
        const newValue = this.merge(ret[retKey], rhs[key], false, retKey, ret, rhs);
        if (newValue === undefined) {
          if (spliceCount === undefined) delete ret[retKey];
          else {
            ret.splice(retKey, 1);
            ++spliceCount;
          }
        } else {
          ret[retKey] = newValue;
        }
      }
      return ret;
    },
  }.entrySpread(target, spreadee);
};
