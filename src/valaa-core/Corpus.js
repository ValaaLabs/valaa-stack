// @flow

import { invariantifyObject, invariantifyFunction } from "~/valaa-tools/invariantify";

import type { Action } from "~/valaa-core/command";
import Bard from "~/valaa-core/redux/Bard";
import layoutByObjectField from "~/valaa-core/tools/denormalized/layoutByObjectField";

import { dumpObject } from "~/valaa-tools/wrapError";


/**
 * Bards in general and Corpus in specific are responsibile for managing incoming actions and
 * modifying state in response to them.
 *
 * Valker, Discourses and Transactions are responsible for computation and creation of actions.
 *
 * @export
 * @class Corpus
 * @extends {Bard}
 */
export default class Corpus extends Bard {
  constructor ({
    schema, debugLevel, logger, middlewares, reduce, subReduce, initialState,
  }: Object) {
    invariantifyObject(schema, "schema");
    invariantifyFunction(reduce, "reduce");
    invariantifyFunction(subReduce, "subReduce");
    invariantifyObject(initialState, "initialState", { allowUndefined: true });
    super({ schema, debugLevel, logger, subReduce: subReduce || reduce });
    // TODO(iridian): These indirections are spaghetti. Simplify.
    this.reduce = reduce;
    this._dispatch = middlewares.reduceRight(
        (next, middleware) => middleware(this)(next),
        (action, corpus) => {
          const newState = corpus.reduce(corpus.getState(), action);
          corpus.updateState(newState);
          return action;
        });
    this.reinitialize(initialState);
  }

  dispatch (action: Action) {
    try {
      return this._dispatch(action, this);
    } catch (error) {
      throw this.wrapErrorEvent(error, `dispatch()`,
          "\n\taction:", ...dumpObject(action),
          "\n\tthis:", ...dumpObject(this),
      );
    }
  }

  dumpListing () {
    this.warn("Resources denormalized", this.getState().toJS());
    this.warn("Resources by name", layoutByObjectField(this.getState(), "name", ""));
  }

  reinitialize (newInitialState) {
    this.setState(newInitialState);
  }

  fork (overrides) {
    const ret = super.fork(overrides);
    ret.reinitialize(this.getState());
    return ret;
  }
}
