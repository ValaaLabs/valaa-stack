// @flow

import { v4 as uuid } from "uuid";
import { Map as ImmutableMap } from "immutable";

import { createPartitionURI } from "~/valaa-core/tools/PartitionURI";
import { denoteValaaBuiltinWithSignature } from "~/valaa-core/VALK";
import createRootReducer from "~/valaa-core/tools/createRootReducer";
import createValidateActionMiddleware from "~/valaa-core/redux/middleware/validateAction";
import createProcessCommandIdMiddleware from "~/valaa-core/redux/middleware/processCommandId";
import createProcessCommandVersionMiddleware from
    "~/valaa-core/redux/middleware/processCommandVersion";
import { createBardMiddleware } from "~/valaa-core/redux/Bard";
import Corpus from "~/valaa-core/Corpus";

import { AuthorityNexus, FalseProphet, Oracle, Prophet, Scribe } from "~/valaa-prophet";

import ValaaEngine from "~/valaa-engine/ValaaEngine";
import EngineContentAPI from "~/valaa-engine/EngineContentAPI";
import injectScriptAPIToScope from "~/valaa-engine/ValaaSpaceAPI";

import InspireView from "~/valaa-inspire/InspireView";
import { registerVidgets } from "~/valaa-inspire/ui/vidget";

import { createForwardLogger } from "~/valaa-tools/Logger";
import { invariantify, LogEventGenerator, request } from "~/valaa-tools";
import { authorityConfigs, getAuthorityURLFromPartitionURI, createAuthorityProxy }
    from "~/valaa-inspire/authorities";
import { getDatabaseAPI } from "~/valaa-tools/indexedDB/getRealDatabaseAPI";

const DEFAULT_ACTION_VERSION = process.env.DEFAULT_ACTION_VERSION || "0.1";

export default class InspireClient extends LogEventGenerator {
  async initialize (revelationPath_: string, revelationOverrides: Object) {
    try {
      const revelationPath = revelationPath_ || "project.manifest.json";
      // Process the initially served landing page and extract the initial Valaa configuration
      // ('revelation') from it. The revelation might be device/locality specific.
      // The revelation might contain initial event log snapshots for select partitions. These
      // event logs might be provided by the landing page provider and might contain relevant
      // partition for showing the front page; alternatively the revelation might be served by the
      // local service worker which intercepted the landing page network request and might contain
      // full snapshots of all partitions that were active during previous session, allowing full
      // offline functionality. Alternatively the service worker can provide the event logs through
      // indexeddb and keep the landing page revelation minimal; whatever is most efficient.
      this.revelation = await this._interpretRevelation(revelationPath, revelationOverrides);

      // Create a connector (the 'scribe') to the locally backed event log / blob indexeddb cache
      // ('scriptures') based on the revelation.
      this.scribe = await this._proselytizeScribe(this.revelation);

      // Create the stream router ('oracle') which uses scribe as its direct upstream, but which
      // manages the remote authority connections.
      this.oracle = await this._summonOracle(this.revelation, this.scribe);

      this.corpus = await this._prepareCorpus(this.revelation);

      // Create the the main in-memory false prophet using the stream router as its upstream.
      this.falseProphet = await this._proselytizeFalseProphet(
            this.revelation, this.corpus, this.oracle);

      // Locate entry point event log (prologue), make it optimally available through scribe,
      // narrate it with false prophet and get the false prophet connection for it.
      this.prologueConnections = await this._narratePrologue(this.revelation, this.scribe,
          this.falseProphet);

      this.entryPartitionConnection =
          this.prologueConnections[this.prologueConnections.length - 1];

      registerVidgets();
      this.warnEvent(`initialize(): registered builtin Inspire vidgets`);
      this.logEvent("Inspire core loaded from", revelationPath);
    } catch (error) {
      throw this.wrapErrorEvent(error, "initialize",
          "\n\tthis:", this);
    }
  }

  createAndConnectViewsToDOM (viewConfigs: Object) {
    const ret = {};
    for (const [viewName, viewConfig] of Object.entries(viewConfigs)) {
      this.warnEvent(`createView({ name: '${viewConfig.name}', size: ${
            JSON.stringify(viewConfig.size)} })`);
      const engine = new ValaaEngine({
        name: `${viewConfig.name} Engine`,
        logger: this.getLogger(),
        prophet: this.falseProphet,
        revelation: this.revelation,
      });
      engine.setRootScopeEntry("inspireClient", this);

      const Valaa = injectScriptAPIToScope(engine.getRootScope(), engine.getHostObjectDescriptors(),
          this.discourse.getSchema());
      let RemoteAuthorityURI;
      let getPartitionIndexEntityCall;
      if (!viewConfig.defaultAuthorityURI) {
        RemoteAuthorityURI = null;
        getPartitionIndexEntityCall = function getPartitionIndexEntity () {
          throw new Error(`Cannot locate partition index entity; Inspire view configuration${
              ""} doesn't specify defaultAuthorityURI`);
        };
      } else {
        // FIXME(iridian): Implement this.schemes - still missing.
        const defaultAuthorityConfig = this.schemes[viewConfig.defaultAuthorityURI];
        invariantify(defaultAuthorityConfig,
            `defaultAuthorityConfig missing when looking for default authority ${
                  String(viewConfigs.defaultAuthorityURI)}`);
        RemoteAuthorityURI = defaultAuthorityConfig.partitionAuthorityURI;
        getPartitionIndexEntityCall = function getPartitionIndexEntity () {
          return engine.tryVrapper(defaultAuthorityConfig.repositoryIndexId);
        }
      }
      Valaa.InspireClient = {
        RemoteAuthorityURI,
        LocalAuthorityURI: "valaa-local:",
        getPartitionIndexEntity: denoteValaaBuiltinWithSignature(
          `Returns the partition corresponding to the partition index.`
        )(getPartitionIndexEntityCall),
      };
      ret[viewName] = new InspireView({ engine, name: `${viewConfig.name} View` })
          .initialize(viewConfig);
    }
    return ret;
  }


  /**
   * Processes the landing page and extracts the revelation from it.
   *
   * @param {string} revelationPath
   * @param {Object} revelationOverrides
   * @returns
   *
   * @memberof InspireClient
   */
  async _interpretRevelation (revelationPath: string, revelationOverrides: Object): Object {
    let revelation;
    try {
      revelation = await request({ url: revelationPath });
      // const rootPath = window.location.href.match(/^(.*?)[^/]*$/)[1];

      // Apply overrides and defaults
      for (const [optionName, override] of Object.entries(revelationOverrides || {})) {
        if (typeof override !== "undefined") revelation[optionName] = override;
      }
      if (!revelation.scribe) {
        revelation.scribe = { logLevel: 0 };
      }
      if (!revelation.falseProphet) {
        revelation.falseProphet = { logLevel: 0 };
      }
      if (!revelation.authorityConfigs) {
        revelation.authorityConfigs = authorityConfigs;
      }
      this.warnEvent(`Loaded landing revelation '${revelationPath}'`,
          revelation, ...(!revelationOverrides ? [] : ["with overrides:", revelationOverrides]));
      // in case the direct partition uri was already set in the revelation and we had no other come
      // we want to change it from a string to the right object
      return revelation;
    } catch (error) {
      throw this.wrapErrorEvent(error, "interpretRevelation",
          "\n\trevelationPath:", revelationPath,
          "\n\trevelationOverrides:", revelationOverrides,
          "\n\trevelation:", revelation);
    }
  }

  async _proselytizeScribe (revelation: Object): Promise<Scribe> {
    try {
      this._commandCountListeners = new Map();
      const name = { name: "Inspire Scribe" };
      const scribe = await new Scribe({
        name,
        logger: this.getLogger(),
        databaseAPI: getDatabaseAPI(),
        commandCountCallback: this._updateCommandCount,
        ...revelation.scribe,
      });
      await scribe.initialize();
      this.warnEvent(`Proselytized Scribe '${scribe.debugId()}', with revelation.scribe:`,
          revelation.scribe,
      //    "\n\tscribe:", scribe
      );
      return scribe;
    } catch (error) {
      throw this.wrapErrorEvent(error, "proselytizeScribe",
          "\n\trevelation:", revelation);
    }
  }

  _updateCommandCount = (totalCount: number, partitionCommandCounts: Object) => {
    this._totalCommandCount = totalCount;
    this._partitionCommandCounts = partitionCommandCounts;
    this._commandCountListeners.forEach(listener => listener(totalCount, partitionCommandCounts));
  }

  setCommandCountListener (component: Object,
      callback: (totalCount: number, partitionCommandCounts: Object) => void) {
    if (!callback) this._commandCountListeners.delete(component);
    else {
      this._commandCountListeners.set(component, callback);
      callback(this._totalCommandCount, this._partitionCommandCounts);
    }
  }

  async _summonOracle (revelation: Object, scribe: Scribe): Promise<Prophet> {
    try {
      const name = { name: "Inspire Oracle" };
      const oracle = new Oracle({
        name,
        logger: this.getLogger(),
        debugLevel: 1,
        getAuthorityURLFromPartitionURI,
        createAuthorityProxy: createAuthorityProxy.bind(this, revelation.authorityConfigs),
        scribe,
      });
      this.warnEvent(`Created Oracle ${oracle.debugId()}, with:`,
          "\n\trevelation.authorityConfigs:", revelation.authorityConfigs,
      //    "\n\toracle:", oracle
      );
      return oracle;
    } catch (error) {
      throw this.wrapErrorEvent(error, "summonOracle",
          "\n\trevelation:", revelation,
          "\n\tscribe:", scribe);
    }
  }

  async _prepareCorpus (revelation: Object) {
    const name = "Inspire Corpus";
    const nameContainer = { name };
    const logLevel = revelation.falseProphet.logLevel || 0;
    const { schema, validators, logger, reducer, subReduce } = createRootReducer({
      ...EngineContentAPI, // schema, validators, reducers
      logger: createForwardLogger({ name, target: this.getLogger(), enableLog: logLevel >= 1 }),
      subLogger: createForwardLogger({ name, target: this.getLogger(), enableLog: logLevel >= 2 }),
      reducerName: nameContainer,
    });

    const previousId = uuid(); // FIXME(iridian): Create the deterministic-id schema. Now random.
    const defaultCommandVersion = DEFAULT_ACTION_VERSION;
    const middleware = [
      createProcessCommandVersionMiddleware(defaultCommandVersion),
      createProcessCommandIdMiddleware(previousId, schema),
      createValidateActionMiddleware(validators),
      createBardMiddleware({ name: { name: "Inspire Bard" }, schema, logger, subReduce }),
    ];

    return new Corpus({
      nameContainer, schema, middleware, reducer,
      logger: createForwardLogger({ name }),
      initialState: new ImmutableMap(),
      debug: undefined,
    });
  }

  async _proselytizeFalseProphet (revelation: Object, corpus: Corpus, upstream: Prophet):
      Promise<Prophet> {
    try {
      const name = { name: "Inspire FalseProphet" };
      const falseProphet = new FalseProphet({
        name,
        corpus,
        upstream,
        schema: EngineContentAPI.schema,
        logger: this.getLogger(),
      });
      this.warnEvent(`Proselytized FalseProphet ${falseProphet.debugId()}, with:`,
          "\n\trevelation.falseProphet:", revelation.falseProphet,
      //    "\n\tfalse prophet:", falseProphet
      );
      return falseProphet;
    } catch (error) {
      throw this.wrapErrorEvent(error, "proselytizeFalseProphet",
          "\n\trevelation:", revelation,
          "\n\tupstream:", upstream);
    }
  }

  async _narratePrologue (revelation: Object, scribe: Scribe, falseProphet: Prophet) {
    let prologues;
    try {
      this.warnEvent(`Narrating revelation prologues`);
      prologues = await this._loadRevelationEntryPartitionAndPrologues(revelation);
      this.warnEvent(`Narrated revelation prologue with ${prologues.length} entry points:`,
          "\n\t:", `'${prologues.map(({ partitionURI }) => String(partitionURI)).join("', '")}'`);
      const ret = await Promise.all(prologues.map(({ partitionURI, eventLog, isNewPartition }) =>
          falseProphet.acquirePartitionConnection(partitionURI, {
            eventLog,
            retrieveMediaContent: undefined,
            createNewPartition: isNewPartition,
          })
      ));
      this.warnEvent(`Acquired active connections for all revelation prologue partitions:`,
          "\n\tconnections:", ret.map(connection => [connection.debugId()/* , connection */]));
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, "narratePrologue",
          "\n\trevelation:", revelation,
          "\n\tscribe:", scribe,
          "\n\tfalseProphet:", falseProphet,
          "\n\tprologues:", prologues);
    }
  }

  async _loadRevelationEntryPartitionAndPrologues (revelation: Object) {
    const ret = [];
    try {
      if (revelation.directPartitionURI) {
        ret.push({
          partitionURI: createPartitionURI(revelation.directPartitionURI),
          eventLog: [],
          isNewPartition: false,
        });
      } else {
        // These are not obsolete yet, but temporarily disabled.
        if (Array.isArray(revelation.snapshotEventPaths)) {
          throw new Error("revelation.snapshotEventPaths temporarily disabled");
          /*
          for (const [partitionURIString, snapshotPath] of revelation.snapshotEventPaths) {
            invariantifyString(partitionURIString,
                "revelation.snapshotEventPaths[0]: partition URI string");
            invariantifyString(snapshotPath,
                "revelation.snapshotEventPaths[1]: snapshot event path");
            const snapshotEvent = await request({ url: snapshotPath });
            convertLegacyCommandInPlace(snapshotEvent);
            this.warnEvent(`Located legacy partition '${partitionURIString}' snapshot event at '${
                snapshotPath}'`, "\n\tsnapshot event:", snapshotEvent);
            const partitionURI = createPartitionURI(partitionURIString);
            invariantifyObject(partitionURI, "revelation.snapshotEventPaths[0]: partitionURI",
                { instanceof: URL, allowEmpty: true });
            ret.push({
              partitionURI,
              eventLog: [snapshotEvent],
              isNewPartition: false,
            });
          }
          */
        }
        if (revelation.initialEventPath) {
          throw new Error("revelation.initialEventPath temporarily disabled");
          /*
          // Legacy revelation.
          const initialEvent = await request({ url: revelation.initialEventPath });
          convertLegacyCommandInPlace(initialEvent);
          const initialCreateEntityEvent = initialEvent.actions && initialEvent.actions[0];
          invariantifyString(initialCreateEntityEvent && initialCreateEntityEvent.typeName,
              "legacy entry point missing: first event is not an Entity CREATED",
              { value: "Entity" });

          const partitionAuthorityURI = "valaa-local:";
          if (!initialCreateEntityEvent.initialState) initialCreateEntityEvent.initialState = {};
          initialCreateEntityEvent.initialState.partitionAuthorityURI = partitionAuthorityURI;
          initialEvent.partitions = { [releaseEvent.id]: { eventId: 0, partitionAuthorityURI } };
          this.warnEvent(`Located legacy entry point`, `${releaseEvent.id}:Entity`);
          ret.push({
            partitionURI: createPartitionURI(partitionAuthorityURI, releaseEvent.id),
            eventLog: [initialEvent],
            isNewPartition: true,
          });
          */
        }
      }
      if (!ret.length) {
        throw new Error(`${this.debugId()
            }.loadRevelationPrologues: non-legacy prologues not implemented yet`);
      }
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, "loadRevelationEntryPartitionAndPrologues",
          "\n\trevelation.snapshotEventPaths:", revelation.snapshotEventPaths,
          "\n\trevelation.initialEventPath:", revelation.initialEventPath,
          "\n\trevelation.postPrologueEventPaths:", revelation.postPrologueEventPaths,
      );
    }
  }
}
