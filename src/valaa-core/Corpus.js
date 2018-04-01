import { invariantifyObject, invariantifyFunction } from "~/valaa-tools/invariantify";
import { createStore, applyMiddleware } from "redux";

import Valker from "~/valaa-core/VALK/Valker";
import layoutByObjectField from "~/valaa-core/tools/denormalized/layoutByObjectField";

import wrapError, { dumpObject } from "~/valaa-tools/wrapError";

let corpusIndex = 0;

export default class Corpus extends Valker {
  constructor ({ schema, middleware, reducer, initialState, debug, logger, nameContainer,
    packFromHost, unpackToHost, builtinSteppers
  }) {
    invariantifyObject(schema, "schema");
    invariantifyFunction(reducer, "reducer");
    invariantifyObject(initialState, "initialState", { allowUndefined: true });
    invariantifyObject(nameContainer, "name", { allowUndefined: true });
    super(schema, debug, logger, packFromHost, unpackToHost, builtinSteppers);
    // TODO(iridian): These indirections are spaghetti. Simplify.
    this.reducer = reducer;
    this.nameContainer = nameContainer || { name: `Unnamed Corpus #${++corpusIndex}` };
    this.storeCreator = !middleware ? createStore : applyMiddleware(...middleware)(createStore);
    this.reinitialize(initialState);
  }

  dispatch (action) {
    let previousName;
    try {
      if (this.nameOverride) {
        previousName = this.nameContainer.name;
        this.nameContainer.name = this.nameOverride;
      }
      const story = this.store.dispatch(action);
      this.setState(this.store.getState());
      if (previousName) this.nameContainer.name = previousName;
      return story;
    } catch (error) {
      if (previousName) this.nameContainer.name = previousName;
      throw wrapError(error, `During ${this.debugId()}\n .dispatch(${
          this.nameOverride || (this.nameContainer && this.nameContainer.name)}), with:`,
          "\n\taction:", ...dumpObject(action),
      );
    }
  }

  dumpListing () {
    this.warn("Resources denormalized", this.getState().toJS());
    this.warn("Resources by name", layoutByObjectField(this.getState(), "name", ""));
  }

  reinitialize (newInitialState) {
    this.store = this.storeCreator(this.reducer, newInitialState);
    this.setState(this.store.getState());
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
