import { Map } from "immutable";
import mapValues from "lodash/mapValues";
import mergeWith from "lodash/mergeWith";
import zipObject from "lodash/zipObject";
import fill from "lodash/fill";
import omit from "lodash/omit";

import { dumpify, invariantifyArray, LogEventGenerator } from "~/valaa-tools";

/**
 * Combines a list of reducer-by-action-type objects into a single reducer-by-action-type.
 * Individual reducers for each action type are then chained together.
 */
function mergeActionReducers (reducers, context) {
  invariantifyArray(reducers, "mergeActionReducers.reducers");
  const reducerListsByActionType = reducers.reduce((result, reducerByActionType) =>
      mergeWith(result,
          reducerByActionType(context),
          (list, reducer) => (list || []).concat([reducer])),
      {});
  return Object.freeze(mapValues(reducerListsByActionType,
      reducerList => function reduceChain(state, action, ...rest) {
        return reducerList.reduce(
            (innerState, reducer) => reducer.call(this, innerState, action, ...rest),
            state,
        );
      }
  ));
}

export function missingReducers (actionTypes) {
  return zipObject(actionTypes, fill([...actionTypes], state => state));
}

/**
 * Creates the root server reducer.
 *
 * Golden rules of reduction: Reducers always succeed.
 *
 * This principle is there to ensure the lookup state is always consistent or blocked.
 * Eventually a reducer will fail in production. This is treated as an internal error, it shall halt
 * the event sourcing so that queries will still work, escalate the issue and initiate recovery
 * mechanisms. Servers should in principle hold minimalistic state to localize the consequences of
 * a corrupted action.
 *
 * The guidelines to help with this rule:
 * 1. Reducers never wait on external resources. External resources can fail.
 * 2. Similarily reducers are never async. Event time is linear so there's no benefit, but risks.
 * 3. Only exceptions allowed are internal errors which will be escalated.
 * 4. Hook function calls must always be done by delayCall(() => doHookCallbackstuff) which will
 *    perform the callback once the reducer has finished executing.
 *
 * To facilitate middleware which does preliminary reduction based validation of actions:
 * 5. All side-effects must be wrapped inside delayCall, so that if a reduction of a new action
 *    fails the delayed calls (and the candidate reduction state head) can be safely discarded.
 */
export default function createRootReducer ({
  schema, logEventer, reducers, validators, context = {},
  subReduceLogThreshold = 2, reduceLogThreshold = 1
}) {
  const reducerContext = {
    subReduce,
    ...context,
    schema,
    logEventer,
    delayCall,
    mainReduce,
    reducers,
    validators,
  };
  const reducerByActionType = mergeActionReducers(reducers, reducerContext);
  if (!reducerContext.logEventer) {
    reducerContext.logEventer = new LogEventGenerator({ name: "Unnamed reducer" });
  }

  function delayCall (callback) {
    // The Promise specification guarantees that then() handlers will be executed only after the
    // execution stack only has platform functions. So we're golden.
    Promise.resolve().then(callback).catch(error => {
      (this || reducerContext.logEventer)
          .error(`ERROR: While executing delayed call: ${error.message}, for callback ${callback
              }, in ${error.stack}`);
    });
  }

  function mainReduce (state = Map(), action) {
    const mainLogEventer = this || reducerContext.logEventer;
    try {
      if (mainLogEventer.getDebugLevel() >= reduceLogThreshold) {
        const time = action.timeStamp;
        const minor = action.typeName ? `${action.typeName} ` : "";
        mainLogEventer.logEvent(`Reducing @${time} ${action.type} ${minor}${
            dumpify(action.commandId, 7, "...")} ${JSON.stringify(omit(action,
                ["timeStamp", "type", "typeName", "id", "passages", "parentPassage", "bard"]))
            .slice(0, 380)
        }`);
      }
      const reducer = reducerByActionType[action.type];
      if (reducer) return reducer.call(this, state, action);
      mainLogEventer.warnEvent(
          `WARNING: While reducing, no reducer for action type ${action.type}, ignoring`);
      return state;
    } catch (error) {
      throw mainLogEventer.wrapErrorEvent(error, `mainReduce(${action.type}, ${action.commandId})`,
          "\n\taction:", action,
          "\n\tthis:", this);
    }
  }
  /**
   * Reduces given action as a sub-action with the appropriate reducer.
   * Note: passes 'this' as a third argument for the reducer.
   * @param {any} action       command, event, story or passage.
   * @param {any} parentPassage
   * @returns
   */
  function subReduce (state, action) {
    const subLogEventer = this || reducerContext.logEventer;
    try {
      if (subLogEventer.getDebugLevel() >= subReduceLogThreshold) {
        const time = action.timeStamp;
        let minor = action.typeName ? `${action.typeName} ` : "";
        if (action.id) minor = `${minor} ${dumpify(action.id, 40, "...")}`;
        subLogEventer.logEvent(`Sub-reducing @${time} ${action.type} ${minor}${JSON.stringify(omit(
            action, ["timeStamp", "type", "typeName", "id", "passages", "parentPassage", "bard"]))
                .slice(0, 380)
        }`);
      }
      if (action.story && action.story.isBeingUniversalized) {
        // Offers limited protection against programming errors for generated passages especially.
        const validator = validators[action.type];
        if (!validator) throw new Error(`No validator found for sub-action of type ${action.type}`);
        validator(action);
      }
      const reducer = reducerByActionType[action.type];
      if (reducer) return reducer.call(this, state, action);
      throw new Error(`No reducer found for sub-action of type ${action.type}`);
    } catch (error) {
      throw subLogEventer.wrapErrorEvent(error, `subReduce(${action.typeName})`,
          "\n\taction:", action,
          "\n\tthis:", this);
    }
  }
  return reducerContext;
}
