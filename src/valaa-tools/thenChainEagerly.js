import isPromise from "~/valaa-tools/isPromise";

/**
 * Chains head through the given function chain 'eagerly', resolving all promises along the way.
 * Functionally follows following code:
 *
 * return functionChain.reduce(async (accum, f) => f(await accum), initialValue)
 *
 * 'Eagerly' means that if no promises are encountered at any step then the whole evaluation is
 * done synchronously and return value is immediately available, like with following code:
 *
 * return functionChain.reduce((accum, f) => f(accum), initialValue)
 *
 * Rationale: in Valaa codebase there are pathways which sometimes need to work synchronously and
 * sometimes asynchronously, depending on what data can be known to be cached or not.
 * While 'await' keyword can accept non-promise values just fine the issue is that declaring a
 * function to be 'async' means that it will always return a Promise: this means that synchronous
 * callers will be broken. Changing synchronous callers to use await or deal with promises has
 * cascading changes to the surrounding contexts which would lead to larger rewrites.
 *
 * thenChainEagerly solves this problem by retaining the synchronous callsites unchanged with the
 * expense of necessitating the internal sync/async hybrid callpaths to use the somewhat clunkier
 * thenChainEagerly API, instead of the nicer async/await.
 *
 * @export
 * @param {any} head
 * @param {any} callbacks
 */
export default function thenChainEagerly (initialValue, functionChain: Function | Function[],
    onRejected?: Function) {
  return thenChainEagerlyList(initialValue,
      Array.isArray(functionChain) ? functionChain : [functionChain],
      onRejected, 0);
}

export function thenChainEagerlyList (initialValue, functionChain, onRejected, startIndex = 0) {
  let head = initialValue;
  for (let currentIndex = startIndex; currentIndex < functionChain.length; ++currentIndex) {
    if (isPromise(head)) {
      return head.then(resolvedHead => thenChainEagerlyList(
          functionChain[currentIndex](resolvedHead), functionChain, onRejected, currentIndex + 1),
          onRejected && (rejectedHead => onRejected(rejectedHead)));
    }
    head = functionChain[currentIndex](head);
  }
  return head;
}
