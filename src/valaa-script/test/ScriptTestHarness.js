// @flow

import Corpus from "~/valaa-core/Corpus";

import CoreTestHarness, { createCoreTestHarness } from "~/valaa-core/test/CoreTestHarness";
import ScriptTestAPI from "~/valaa-script/test/ScriptTestAPI";
import { Kuery, builtinSteppers } from "~/valaa-script/VALSK";

export function createScriptTestHarness (options: Object, ...commandBlocks: any) {
  return createCoreTestHarness({
    name: "Script Test Harness", ContentAPI: ScriptTestAPI, TestHarness: ScriptTestHarness,
    corpusOptions: { builtinSteppers },
    ...options,
  }, ...commandBlocks);
}

export default class ScriptTestHarness extends CoreTestHarness {}

/**
 * Calls given expressionKuery against given corpus, setting given thisReference as the call this
 * and given scope as the lexical scope of the call.
 *
 * @param {any}    corpus
 * @param {Kuery}  programKuery
 * @param {VRef}   thisReference
 * @param {Object} scope
 * @returns                       the resulting value of the expressionKuery
 */
export function evaluateTestProgram (corpusOrCommandBlocks: any = [],
    head: any, programKuery: Kuery, scope: ?Object, options: Object = {}) {
  let corpus = corpusOrCommandBlocks instanceof Corpus && corpusOrCommandBlocks;
  if (!corpus) {
    const harness = createScriptTestHarness({ debug: options.debug }, ...corpusOrCommandBlocks);
    if (options.harness) Object.setPrototypeOf(options.harness, harness);
    corpus = harness.corpus;
  }
  if (scope) {
    options.scope = scope;
    scope.this = head;
  }
  return corpus.run(head, programKuery, options);
}
