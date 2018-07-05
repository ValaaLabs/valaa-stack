// @flow

/**
 * Mutates given target based with the given source spreadee like a recursive Object.assign. Allows
 * arbitrary transformations of the target value with minimal reliance on customizer callbacks.
 *
 * For this goal deepSpread defines simple source-on-target merge semantics and introduces the
 * titular spread operation along with the *spreader* property for more complex operations.
 *
 * The simple merge semantics depend on the source type: undefined and empty objects are no-ops,
 * arrays append, plain old objects update and all other sources overwrite. If target is not of an
 * appropriate type for an in-place mutation or append a new empty object or array is created,
 * updated and returned. Sources are never mutated or referred to from the final result value.
 *
 * Examples:
 *
 * deepSpread({ foo: [1], bar: "a" }, { foo: [2], bar: "b" })          -> { foo: [1, 2], bar: "b" }
 * deepSpread({ foo: [1] }, [{ foo: [2, 3] }, { foo: { 1: 4 } }])      -> { foo: [1, 4, 3] }
 * deepSpread({ foo: [1] }, { foo: null })                             -> { foo: null }
 * deepSpread({ foo: [1] }, [{ foo: null }, { foo: [3] }])             -> { foo: [3] }
 *
 *
 * If an object source has a spreader property (by default "...") a deepSpread operation is
 * performed like so: target = deepSpread(target, spreadee["..."]). The normal value merge is then
 * done on the target, omitting the spreader property.
 *
 * Spread operation applies a spreadee on target. If the spreadee is an array this simplifies to
 * a sequence of simple merges of the entries to the target. If the spreadee is a function it is
 * called with the current target and returned. A null or undefined spreadee returns undefined.
 *
 * If the spread operation is called from a plain object update operation on some container entry
 * and returns undefined the corresponding entry will be deleted or spliced from the container.
 *
 * deepSpread([1, 2, 3], { 1: null })                                  -> [1, null, 3]
 * deepSpread([1, 2, 3], { 1: undefined })                             -> [1, undefined, 3]
 * deepSpread([1, 2, 3], { 1: { "...": null } })                       -> [1, 3]
 *
 *
 * Examples of spreaders:
 *
 * const fooRewriter = { "...": [{ foo: null }, { foo: [3] }] }
 * deepSpread({de:{ep:{ foo: [1] }}}, {de:{ep: fooRewriter }})         -> {de:{ep:{ foo: [3] }}}
 *
 * const arrayRewriter = { "...": [null, [3]] }
 * deepSpread({de:{ep:{ foo: [1] }}}, {de:{ep:{ foo: arrayRewriter }}})-> {de:{ep:{ foo: [3] }}}
 *
 *
 * Elementary merge rules as "lhs ... rhs -> result" productions based on rhs type:
 *
 * rhs: undefined | {}          -> lhs
 * rhs: { "...": spr, ...rest } -> deepSpread(deepSpread(lhs, spr), rest)
 * rhs: Array                   -> asArray(lhs, (ret =>
 *                                     rhs.forEach(e => ret.push(deepSpread(null, [e])))))
 * rhs: Object                  -> asObject(lhs, (ret => Object.keys(rhs).forEach(key =>
 *                                     { ret[key] = deepSpread(ret[key], [rhs[key]]); });
 * rhs: any                     -> rhs
 *
 * @export
 * @param {*} target
 * @param {*} spreadee
 * @param {*} stack
 */
export default function deepSpread (target: Object, spreadee: Array<any>, options: {
  spreadProperty?: string, spread?: Function, customize?: Function, keyPath?: Array<any>,
}) {
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
}
