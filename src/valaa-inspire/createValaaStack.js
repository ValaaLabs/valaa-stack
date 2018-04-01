// @flow

import { Map as ImmutableMap } from "immutable";
import { v4 as uuid } from "uuid";

import { getDatabaseAPI } from "~/valaa-tools/indexedDB/getRealDatabaseAPI";

import createRootReducer from "~/valaa-core/tools/createRootReducer";
import createValidateActionMiddleware from "~/valaa-core/redux/middleware/validateAction";
import createProcessCommandIdMiddleware from "~/valaa-core/redux/middleware/processCommandId";
import createProcessCommandVersionMiddleware from
    "~/valaa-core/redux/middleware/processCommandVersion";
import { createBardMiddleware } from "~/valaa-core/redux/Bard";
import Corpus from "~/valaa-core/Corpus";

import { Prophet, Scribe, FalseProphet, Oracle } from "~/valaa-prophet";

import { createForwardLogger } from "~/valaa-tools/Logger";

const DEFAULT_ACTION_VERSION = process.env.DEFAULT_ACTION_VERSION || "0.1";

// TODO(iridian): This file is a strange half-assed remnant with no purpose. In principle it could
// be the shared code between InspireClient.js and InspireClient.test.js, but there is no
// InspireClient.test.js. Should either be merged to InspireClient or stuff in there should be
// extracted here.

export async function createScribe (ContentAPI: Object, options: Object = {}) {
  const name = { name: "Inspire Scribe" };
  const ret = new Scribe({
    name,
    databaseAPI: getDatabaseAPI(),
    ...options
  });
  await ret.initialize();
  return ret;
}

export function createOracle (options: Object) {
  const name = { name: "Inspire Oracle" };
  return new Oracle({ name, ...options });
}

export function createFalseProphet (upstream: Prophet, ContentAPI: Object,
    { logger, logLevel = 0 }: Object = {}) {
  const name = { name: "Inspire FalseProphet" };
  const reducerContext = createInspireReducer(ContentAPI, name, logger, logLevel);
  const corpus = new Corpus({
    nameContainer: name,
    initialState: new ImmutableMap(),
    middleware: createInspireMiddleware(reducerContext),
    reducer: reducerContext.mainReduce,
    schema: ContentAPI.schema,
    debug: undefined,
    logger: createForwardLogger({ name }),
  });
  return new FalseProphet({
    name,
    corpus,
    upstream,
    schema: ContentAPI.schema,
    logger,
  });
}

function createInspireMiddleware ({ schema, validators, logger, subReduce }) {
  // FIXME(iridian): Root the previousId to something smarter?
  const previousId = uuid();
  const defaultCommandVersion = DEFAULT_ACTION_VERSION;
  const bardName = { name: "Inspire Bard" };
  return [
    createProcessCommandVersionMiddleware(defaultCommandVersion),
    createProcessCommandIdMiddleware(previousId, schema),
    createValidateActionMiddleware(validators),
    createBardMiddleware({ name: bardName, schema, logger, subReduce }),
  ];
}

function createInspireReducer ({ schema, validators, reducers }, reducerName, target, logLevel) {
  return createRootReducer({
    schema,
    validators,
    reducers,
    logger: createForwardLogger({ name: reducerName.name, target, enableLog: logLevel >= 1 }),
    subLogger: createForwardLogger({ name: reducerName.name, target, enableLog: logLevel >= 2 }),
    reducerName,
  });
}
