import { v4 as uuid } from "uuid";

import { OrderedMap } from "immutable";

import type Command from "~/valaa-core/command/Command";
import createRootReducer from "~/valaa-core/tools/createRootReducer";
import createValidateActionMiddleware from "~/valaa-core/redux/middleware/validateAction";
import createProcessCommandIdMiddleware from "~/valaa-core/redux/middleware/processCommandId";
import createProcessCommandVersionMiddleware from
    "~/valaa-core/redux/middleware/processCommandVersion";
import { createBardMiddleware, isRestrictedCommand, createUniversalizableCommand }
    from "~/valaa-core/redux/Bard";

import CoreTestAPI from "~/valaa-core/test/CoreTestAPI";

import { dumpify, dumpObject, invariantify, LogEventGenerator, Logger } from "~/valaa-tools";
import Corpus from "~/valaa-core/Corpus";

const DEFAULT_ACTION_VERSION = "0.1";

export function createCoreTestHarness (options: Object, ...commandBlocks: any) {
  const TestHarness = options.TestHarness || CoreTestHarness;
  const ret = new TestHarness({
    name: "Core Test Harness", ContentAPI: CoreTestAPI,
    ...options,
  });
  commandBlocks.forEach(commandBlock => commandBlock.forEach(command =>
      ret.dispatch(command)));
  return ret;
}

export default class CoreTestHarness extends LogEventGenerator {
  constructor ({ ContentAPI, name, debug, reducerOptions, corpusOptions }) {
    super({ name, debugLevel: debug });
    this.ContentAPI = ContentAPI;
    this.schema = ContentAPI.schema;
    this.reducerOptions = reducerOptions;
    this.corpusOptions = corpusOptions;
    this.corpus = this.createCorpus();
  }

  /**
   * run always delegates the run to most sophisticated component in the harness.
   * For CoreTestHarness, the target is the corpus.
   *
   * @param {any} rest
   *
   * @memberof CoreTestHarness
   */
  run (...rest) { return this.corpus.run(...rest); }

  getState () { return this.corpus.getState(); }

  /**
   * dispatch always delegates the operation to corpus.dispatch (handlings restricted commands is
   * done via .claim, which is not available in core). Also does validation for is-restricted for
   * incoming commands, and for is-universal for resulting stories.
   *
   * @param {any} rest
   *
   * @memberof CoreTestHarness
   */
  dispatch (restrictedCommand: Command) {
    let story;
    try {
      const universalizableCommand = createUniversalizableCommand(restrictedCommand);
      invariantify(isRestrictedCommand(universalizableCommand),
          "universalizable command must still be restricted");
      story = this.corpus.dispatch(universalizableCommand);
      invariantify(!isRestrictedCommand(universalizableCommand),
          "universalized story must not be restricted");
      return story;
    } catch (error) {
      throw this.wrapErrorEvent(error, "Dispatch",
          "\n\trestrictedCommand:", ...dumpObject(restrictedCommand),
          "\n\tstory:", ...dumpObject(story));
    }
  }

  createTestLogger (logger: Logger = console) {
    function dumpifyLogValue (v) { return !v || typeof v !== "object" ? v : dumpify(v); }
    return {
      log: !this.getDebugLevel()
          ? () => {}
          : (...params) => logger.log(...(params.map(dumpifyLogValue))),
      warn: (...params) => logger.warn(...(params.map(dumpifyLogValue))),
      error: (...params) => {
        logger.log(...(params.map(dumpifyLogValue)));
        throw new Error(params.map(dumpifyLogValue).join(", "));
      },
    };
  }

  createCorpus () {
    const reducerName = { name: `${this.getName()} Reducer` };
    const { schema, validators, logger, mainReduce, subReduce } = createRootReducer(Object.freeze({
      reducerName,
      ...this.ContentAPI,
      logger: this.createTestLogger(),
      ...(this.reducerOptions || {}),
    }));
    return new Corpus(Object.freeze({
      nameContainer: reducerName,
      initialState: OrderedMap(),
      middleware: this.createTestMiddleware({ schema, validators, logger, subReduce }),
      reducer: mainReduce,
      schema,
      debug: this.getDebugLevel(),
      logger,
      // stubify all unpacked Transient's when packing: this causes them to autorefresh
      packFromHost: value => (value instanceof OrderedMap ? value.get("id") : value),
      unpackToHost: value => {
        if (!(value instanceof OrderedMap)) return value;
        const id = value.get("id");
        if (!id || (id.typeof() !== "Resource")) return value;
        return id;
      },
      ...(this.corpusOptions || {}),
    }));
  }

  createTestMiddleware ({ schema, validators, logger, subReduce }) {
    const previousId = uuid();
    const defaultCommandVersion = DEFAULT_ACTION_VERSION;
    const bardName = { name: `Test Bard` };
    return [
      createProcessCommandVersionMiddleware(defaultCommandVersion),
      createProcessCommandIdMiddleware(previousId, schema),
      createValidateActionMiddleware(validators),
      createBardMiddleware({ name: bardName, schema, logger, subReduce }),
    ];
  }
}
