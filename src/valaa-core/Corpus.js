import { invariantifyObject, invariantifyFunction } from "~/valaa-tools/invariantify";
import { createStore, applyMiddleware } from "redux";

import Valker from "~/valaa-core/VALK/Valker";
import layoutByObjectField from "~/valaa-core/tools/denormalized/layoutByObjectField";

import wrapError, { dumpObject } from "~/valaa-tools/wrapError";

let corpusIndex = 0;

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
    invariantifyObject(nameContainer, "name", { allowUndefined: true });
    super(schema, debug, logger, packFromHost, unpackToHost, builtinSteppers);
    // TODO(iridian): These indirections are spaghetti. Simplify.
    this.reduce = reduce;
    this._dispatch = middlewares.reduceRight(
        (next, middleware) => middleware(this)(next),
        (action, corpus) => {
          const newState = corpus.reduce(corpus.getState(), action);
          corpus.updateState(newState);
          return action;
        });
    this.reducer = reducer;
    this.nameContainer = nameContainer || { name: `Unnamed Corpus #${++corpusIndex}` };
    this.storeCreator = !middleware ? createStore : applyMiddleware(...middleware)(createStore);
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
    if (overrides && overrides.nameOverride) {
      invariantifyObject(this.nameContainer,
          "nameContainer must exist when fork.nameOverride specified");
    }
    const ret = super.fork(overrides);
    ret.reinitialize(this.getState());
    return ret;
  }
}
