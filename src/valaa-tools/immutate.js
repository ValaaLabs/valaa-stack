/**
 * Author: Iridian Kiiskinen
 *
 * Poor man's immutable mutator.
 * Given input (any plain javascript object of nested objects and arrays) immutate returns a hybrid
 * shallow-deep-copy construct or an 'immutation'. This construct can be mutated without affecting
 * the original. After finalization the immutation will share all the sub-objects and -arrays of the
 * input which were not touched during the immutation.
 *
 * The object returned is a root 'immutator' which is a shallow copy of the input root object.
 * This immutator is created using the optionally given copier. Two temporary members are set
 * to it for the duration of the immutation: __immutate and __previous.
 * __previous refers to the corresponding value of in the input, ie. the previous value.
 * __immutate is used to create new nested immutators for sub-objects. Like the root immutator each
 * sub-immutator is a shallow copy of its previous value and has __immutate and __previous fields.
 * The immutators' fields can be modified like regular JS object as long as __immutate and
 * __previous are unaffected.
 *
 * The immutation must be finalized with __finalizeImmutation call on the root immutator. This will
 * remove the __immutate and __previous from all immutators that have been part of this immutation.
 * This effectively reverts the immutators into the final, clean values in the new immutated root.
 *
 * The implementation with the default copier is naive and simple. Recursive structures or DAG's
 * with converging paths are only partially supported: the recursion will be followed infinitely and
 * any convering DAG paths will diverge. Result of the immutation is thus always a tree.
 * This behaviour can be altered with custom implementations of copier and finalizer.
 *
 * Comparison against immutable-js.
 * Pros: Works on native structures and yields native structures. Very simple and natural API.
 *   Lean and very efficient implementation.
 *
 * Cons: Fully copies the native structures when objects. No tree optimizations here.
 *   Intrusive: introduces __immutate and __previous temporarily to new objects during immutation.
 *
 * @param {any} input
 * @param {function} [copier=defaultCopier]
 *   copier is executed before immutator fields are added whenever a new immutator object is needed.
 *   It takes an input object as a parameter and returns any non-frozen object or undefined which
 *   immutate will convert to an exception.
 *   Default will copy arrays with [...input], copy remaining objects with Object.assign({}, input),
 *   convert undefined input into empty objects and return undefined otherwise for an exception.
 *
 * @param {function} [finalizer=freezeFinalizer]
 *   finalizer is executed to finalize immutators once their immutator fields are removed.
 *   It is given an immutator as a parameter.
 *   Default is Object.freeze.
 * @returns
 */
export default function immutate (input,
    { copier = defaultCopier, finalizer = Object.freeze } = {}) {
  const activeImmutators = [];
  const rootImmutator = createImmutator(input, __immutate);
  if (!rootImmutator || typeof rootImmutator !== "object") {
    throw new Error(`Invalid input encountered during root immutation of: '${
            JSON.stringify(input).slice(0, 100)
        }...',\n\texpected object from copier, got: ${JSON.stringify(rootImmutator)}`);
  }
  rootImmutator.__finalizeImmutation = () => {
    delete rootImmutator.__finalizeImmutation;
    for (const immutator of activeImmutators) {
      delete immutator.__immutate;
      delete immutator.__previous;
      if (finalizer) finalizer(immutator);
    }
    return rootImmutator;
  };
  return rootImmutator;

  /**
   * Returns an immutator object at the end of given fieldNamePath.
   * All steps in between which have not been immutated yet are immutated with copier.
   * Any steps that are missing in the path are initialized to {} by default as per copier.
   * The returned immutator object has temporary __immutate and __previous members which can be used
   * during the immutation process. They're removed once the root immutation is finalized.
   *
   * @param {string[]} fieldNamePath
   * @returns
   */
  function __immutate (...fieldNamePath) {
    let head = this;
    for (let i = 0; i < fieldNamePath.length; i += 1) {
      const step = fieldNamePath[i];
      const stepValue = head[step];
      if (stepValue && (typeof stepValue === "object") && stepValue.__immutate) {
        head = stepValue;
      } else {
        const newImmutator = createImmutator(stepValue);
        if (!newImmutator || typeof newImmutator !== "object") {
          throw new Error(`Invalid step '${step}' value encountered during immutation of path [${
                  fieldNamePath.join(", ")
              }],\n\texpected object from copier, got: ${JSON.stringify(newImmutator
              )},\n\tcurrent stepValue: ${JSON.stringify(stepValue
              )},\n\tat previous step: ${JSON.stringify(head).slice(0, 200)}...`);
        }
        head = head[step] = newImmutator;
      }
    }
    return head;
  }

  function createImmutator (innerInput) {
    const newImmutator = copier(innerInput);
    if (typeof newImmutator === "undefined") return newImmutator;
    newImmutator.__immutate = __immutate;
    newImmutator.__previous = innerInput;
    activeImmutators.push(newImmutator);
    return newImmutator;
  }
}

function defaultCopier (input) {
  if (typeof input === "undefined") return {};
  if (typeof input !== "object") return undefined;
  return Array.isArray(input) ? [...input] : Object.assign({}, input);
}
