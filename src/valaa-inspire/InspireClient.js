// @flow

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
import { Revelation, expose } from "~/valaa-inspire/Revelation";

import { createForwardLogger } from "~/valaa-tools/Logger";
import { getDatabaseAPI } from "~/valaa-tools/indexedDB/getRealDatabaseAPI";
import { invariantify, LogEventGenerator, valaaUUID } from "~/valaa-tools";

const DEFAULT_ACTION_VERSION = process.env.DEFAULT_ACTION_VERSION || "0.1";


export default class InspireClient extends LogEventGenerator {
  async initialize (revelation: Revelation, { schemePlugins }: Object = {}): Object {
    try {
      // Process the initially served landing page and extract the initial Valaa configuration
      // ('revelation') from it. The revelation might be device/locality specific.
      // The revelation might contain initial event log snapshots for select partitions. These
      // event logs might be provided by the landing page provider and might contain relevant
      // partition for showing the front page; alternatively the revelation might be served by the
      // local service worker which intercepted the landing page network request and might contain
      // full snapshots of all partitions that were active during previous session, allowing full
      // offline functionality. Alternatively the service worker can provide the event logs through
      // indexeddb and keep the landing page revelation minimal; whatever is most efficient.
      this.revelation = await this._interpretRevelation(revelation);

      this.setDebugLevel(this.revelation.logLevel || 0);

      this.nexus = await this._establishAuthorityNexus(this.revelation, schemePlugins);

      // Create a connector (the 'scribe') to the locally backed event log / blob indexeddb cache
      // ('scriptures') based on the revelation.
      this.scribe = await this._proselytizeScribe(this.revelation);

      // Create the stream router ('oracle') which uses scribe as its direct upstream, but which
      // manages the remote authority connections.
      this.oracle = await this._summonOracle(this.revelation, this.nexus, this.scribe);

      this.corpus = await this._incorporateCorpus(this.revelation);

      // Create the the main in-memory false prophet using the stream router as its upstream.
      this.falseProphet = await this._proselytizeFalseProphet(
            this.revelation, this.corpus, this.oracle);

      // Locate entry point event log (prologue), make it optimally available through scribe,
      // narrate it with false prophet and get the false prophet connection for it.
      this.prologueConnections = await this._narratePrologues(this.revelation, this.scribe,
          this.falseProphet);

      this.entryPartitionConnection =
          this.prologueConnections[this.prologueConnections.length - 1];

      registerVidgets();
      this.warnEvent(`initialize(): registered builtin Inspire vidgets`);
      this.logEvent("InspireClient initialized, with revelation", this.revelation);
    } catch (error) {
      throw this.wrapErrorEvent(error, "initialize", "\n\tthis:", this);
    }
  }

  createAndConnectViewsToDOM (viewConfigs: {
    [string]: { name: string, size: Object, defaultAuthorityURI: ?string }
  }) {
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
        };
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
   * @param {Object} rawRevelation
   * @returns
   *
   * @memberof InspireClient
   */
  async _interpretRevelation (revelation: Revelation): Object {
    try {
      const ret = await expose(revelation);
      this.warnEvent(`Interpreted revelation`, ret);
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, "interpretRevelation", "\n\trevelation:", revelation);
    }
  }

  async _establishAuthorityNexus (revelation: Object, schemePlugins: Object[]) {
    const name = { name: "Inspire AuthorityNexus" };
    let authorityConfigs;
    try {
      authorityConfigs = await expose(revelation.authorityConfigs);
      const nexus = new AuthorityNexus({ name, authorityConfigs });
      for (const plugin of schemePlugins) nexus.addSchemePlugin(plugin);
      this.warnEvent(`Established AuthorityNexus '${nexus.debugId()}'`);
      return nexus;
    } catch (error) {
      throw this.wrapErrorEvent(error, "establishAuthorityNexus",
          "\n\trevelation.authorityConfigs:", revelation.authorityConfigs,
          "\n\tschemePlugins:", schemePlugins);
    }
  }

  async _proselytizeScribe (revelation: Object): Promise<Scribe> {
    try {
      this._commandCountListeners = new Map();
      const name = { name: "Inspire Scribe" };
      const scribeOptions = await expose(revelation.scribe);
      const scribe = await new Scribe({
        name,
        logger: this.getLogger(),
        databaseAPI: getDatabaseAPI(),
        commandCountCallback: this._updateCommandCount,
        ...scribeOptions,
      });
      await scribe.initialize();
      this.warnEvent(`Proselytized Scribe '${scribe.debugId()}', with:`,
          "\n\tscribeOptions:", scribeOptions,
          "\n\tscribe:", scribe,
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

  async _summonOracle (revelation: Object, authorityNexus: AuthorityNexus, scribe: Scribe):
      Promise<Prophet> {
    try {
      const name = { name: "Inspire Oracle" };
      const oracleOptions = await expose(revelation.oracle);
      const oracle = new Oracle({
        name,
        logger: this.getLogger(),
        debugLevel: 1,
        authorityNexus,
        scribe,
        ...oracleOptions,
      });
      this.warnEvent(`Created Oracle ${oracle.debugId()}, with:`,
      //    "\n\toracle:", oracle
      );
      return oracle;
    } catch (error) {
      throw this.wrapErrorEvent(error, "summonOracle",
          "\n\toracleOptions:", oracleOptions,
          "\n\tscribe:", scribe);
    }
  }

  async _incorporateCorpus (revelation: Object) {
    const name = "Inspire Corpus";
    const nameContainer = { name };
    const reducerOptions = await expose(revelation.reducer);
    const { schema, validators, logger, mainReduce, subReduce } = createRootReducer({
      ...EngineContentAPI, // schema, validators, reducers
      reducerName: nameContainer,
      logger: createForwardLogger({
        name, target: this.getLogger(), enableLog: this.getDebugLevel() >= 1,
      }),
      subLogger: createForwardLogger({
        name, target: this.getLogger(), enableLog: this.getDebugLevel() >= 2,
      }),
      ...reducerOptions,
    });

    // FIXME(iridian): Create the deterministic-id schema. Now random.
    const previousId = valaaUUID();
    const defaultCommandVersion = DEFAULT_ACTION_VERSION;
    const middleware = [
      createProcessCommandVersionMiddleware(defaultCommandVersion),
      createProcessCommandIdMiddleware(previousId, schema),
      createValidateActionMiddleware(validators),
      createBardMiddleware({ name: { name: "Inspire Bard" }, schema, logger, subReduce }),
    ];

    const corpusOptions = await expose(revelation.corpus);
    return new Corpus({
      nameContainer, schema, middleware,
      reducer: mainReduce,
      logger: createForwardLogger({ name, target: this.getLogger() }),
      initialState: new ImmutableMap(),
      debug: undefined,
      ...corpusOptions,
    });
  }

  async _proselytizeFalseProphet (revelation: Object, corpus: Corpus, upstream: Prophet):
      Promise<Prophet> {
    try {
      const name = { name: "Inspire FalseProphet" };
      const falseProphetOptions = await expose(revelation.falseProphet);
      const falseProphet = new FalseProphet({
        name,
        corpus,
        upstream,
        schema: EngineContentAPI.schema,
        logger: this.getLogger(),
        ...falseProphetOptions,
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

  async _narratePrologues (revelation: Object) {
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
