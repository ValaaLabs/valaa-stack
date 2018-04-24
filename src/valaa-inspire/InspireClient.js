// @flow

import { Map as ImmutableMap } from "immutable";

import { VRef } from "~/valaa-core/ValaaReference";
import { createPartitionURI } from "~/valaa-core/tools/PartitionURI";
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
import engineExtendValaaSpace from "~/valaa-engine/ValaaSpace";

import InspireView from "~/valaa-inspire/InspireView";
import { registerVidgets } from "~/valaa-inspire/ui";
import type { Revelation } from "~/valaa-inspire/Revelation";
import inspireExtendValaaSpace from "~/valaa-inspire/ValaaSpace";

import { getDatabaseAPI } from "~/valaa-tools/indexedDB/getRealDatabaseAPI";
import { arrayBufferFromBase64, invariantify, LogEventGenerator, valaaUUID } from "~/valaa-tools";

const DEFAULT_ACTION_VERSION = process.env.DEFAULT_ACTION_VERSION || "0.1";


export default class InspireClient extends LogEventGenerator {

  callRevelation (Type: Function | any) {
    if (typeof Type !== "function") return Type;
    return new Type({ logger: this.getLogger() });
  }

  async initialize (revelation: Revelation) {
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
      this.gatewayRevelation = await this.revelation.gateway;
      if (this.gatewayRevelation.name) this.setName(await this.gatewayRevelation.name);

      this.setDebugLevel(this.gatewayRevelation.verbosity || 0);

      this.nexus = await this._establishAuthorityNexus(this.gatewayRevelation);

      // Create a connector (the 'scribe') to the locally backed event log / blob indexeddb cache
      // ('scriptures') based on the revelation.
      this.scribe = await this._proselytizeScribe(this.gatewayRevelation);

      // Create the stream router ('oracle') which uses scribe as its direct upstream, but which
      // manages the remote authority connections.
      this.oracle = await this._summonOracle(this.gatewayRevelation, this.nexus, this.scribe);

      this.corpus = await this._incorporateCorpus(this.gatewayRevelation);

      // Create the the main in-memory false prophet using the stream router as its upstream.
      this.falseProphet = await this._proselytizeFalseProphet(this.gatewayRevelation,
          this.corpus, this.oracle);

      await this._attachPlugins(this.gatewayRevelation);

      this.prologueRevelation = await this.revelation.prologue;

      // Locate entry point event log (prologue), make it optimally available through scribe,
      // narrate it with false prophet and get the false prophet connection for it.
      this.prologueConnections = await this._narratePrologues(this.prologueRevelation,
          this.scribe, this.falseProphet);

      this.entryPartitionConnection =
          this.prologueConnections[this.prologueConnections.length - 1];

      registerVidgets();
      this.warnEvent(`initialize(): registered builtin Inspire vidgets`);
      this.logEvent("InspireClient initialized, with revelation", revelation);
    } catch (error) {
      throw this.wrapErrorEvent(error, "initialize", "\n\tthis:", this);
    }
  }

  createAndConnectViewsToDOM (viewConfigs: {
    [string]: { name: string, size: Object, defaultAuthorityURI: ?string }
  }) {
    const ret = {};
    for (const [viewName, viewConfig: Object] of Object.entries(viewConfigs)) {
      this.warnEvent(`createView({ name: '${viewConfig.name}', size: ${
            JSON.stringify(viewConfig.size)} })`);
      const engineOptions = {
        name: `${viewConfig.name} Engine`,
        logger: this.getLogger(),
        prophet: this.falseProphet,
        revelation: this.revelation,
      };
      const engine = new ValaaEngine(engineOptions);
      this.warnEvent(`Started ValaaEngine ${engine.debugId()}`,
          ...(!this.getDebugLevel() ? [] : [", with:",
            "\n\tengineOptions:", engineOptions,
            "\n\tengine:", engine,
          ]));

      const rootScope = engine.getRootScope();
      const hostDescriptors = engine.getHostObjectDescriptors();
      engineExtendValaaSpace(rootScope, hostDescriptors, engine.discourse.getSchema());
      if (!viewConfig.defaultAuthorityURI) {
        inspireExtendValaaSpace(rootScope, hostDescriptors);
      } else {
        const defaultAuthorityConfig = this.schemes[viewConfig.defaultAuthorityURI];
        invariantify(defaultAuthorityConfig,
            `defaultAuthorityConfig missing when looking for default authority ${
                  String(viewConfig.defaultAuthorityURI)}`);
        inspireExtendValaaSpace(rootScope, hostDescriptors, defaultAuthorityConfig, engine);
      }
      rootScope.Valaa.inspire = this;
      ret[viewName] = new InspireView({ engine, name: `${viewConfig.name} View` })
          .initialize(viewConfig);
      this.warnEvent(`Opened InspireView ${viewName}`,
          ...(!this.getDebugLevel() ? [] : [", with:",
            "\n\tviewConfig:", viewConfig,
            "\n\tview:", ret[viewName],
          ]));
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
      this.warnEvent(`Interpreted revelation`, revelation);
      return revelation;
    } catch (error) {
      throw this.wrapErrorEvent(error, "interpretRevelation", "\n\trevelation:", revelation);
    }
  }

  async _establishAuthorityNexus (gatewayRevelation: Object) {
    let nexusOptions;
    try {
      nexusOptions = {
        name: "Inspire AuthorityNexus",
        authorityConfigs: await gatewayRevelation.authorityConfigs,
      };
      const nexus = new AuthorityNexus(nexusOptions);
      this.warnEvent(`Established AuthorityNexus '${nexus.debugId()}'`,
          ...(!this.getDebugLevel() ? [] : [", with:",
            "\n\toptions:", nexusOptions,
            "\n\tnexus:", nexus,
          ]));
      return nexus;
    } catch (error) {
      throw this.wrapErrorEvent(error, "establishAuthorityNexus",
          "\n\tnexusOptions:", nexusOptions);
    }
  }

  async _proselytizeScribe (gatewayRevelation: Object): Promise<Scribe> {
    let scribeOptions;
    try {
      this._commandCountListeners = new Map();
      scribeOptions = {
        name: "Inspire Scribe",
        logger: this.getLogger(),
        databaseAPI: getDatabaseAPI(),
        commandCountCallback: this._updateCommandCount,
        ...await gatewayRevelation.scribe,
      };
      const scribe = await new Scribe(scribeOptions);
      await scribe.initialize();

      this.warnEvent(`Proselytized Scribe '${scribe.debugId()}'`,
          ...(!this.getDebugLevel() ? [] : [", with:",
            "\n\tscribeOptions:", scribeOptions,
            "\n\tscribe:", scribe,
          ]));
      return scribe;
    } catch (error) {
      throw this.wrapErrorEvent(error, "proselytizeScribe",
          "\n\tscribeOptions:", scribeOptions);
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

  async _summonOracle (gatewayRevelation: Object, authorityNexus: AuthorityNexus, scribe: Scribe):
      Promise<Prophet> {
    let oracleOptions;
    try {
      oracleOptions = {
        name: "Inspire Oracle",
        logger: this.getLogger(),
        debugLevel: 1,
        authorityNexus,
        scribe,
        ...await gatewayRevelation.oracle,
      };
      const oracle = new Oracle(oracleOptions);
      this.warnEvent(`Created Oracle ${oracle.debugId()}`,
          ...(!this.getDebugLevel() ? [] : [", with:",
            "\n\toracleOptions:", oracleOptions,
            "\n\toracle:", oracle,
          ]));
      return oracle;
    } catch (error) {
      throw this.wrapErrorEvent(error, "summonOracle",
          "\n\toracleOptions:", oracleOptions,
          "\n\tscribe:", scribe);
    }
  }

  async _incorporateCorpus (gatewayRevelation: Object) {
    const name = "Inspire Corpus";
    const reducerOptions = {
      ...EngineContentAPI, // schema, validators, reducers
      logEventer: this,
      ...await gatewayRevelation.reducer,
    };
    const { schema, validators, mainReduce, subReduce } = createRootReducer(reducerOptions);

    // FIXME(iridian): Create the deterministic-id schema. Now random.
    const previousId = valaaUUID();
    const defaultCommandVersion = DEFAULT_ACTION_VERSION;
    const middlewares = [
      createProcessCommandVersionMiddleware(defaultCommandVersion),
      createProcessCommandIdMiddleware(previousId, schema),
      createValidateActionMiddleware(validators),
      createBardMiddleware(),
    ];

    const corpusOptions = {
      name, schema, middlewares,
      reduce: mainReduce,
      subReduce,
      initialState: new ImmutableMap(),
      logger: this.getLogger(),
      ...await gatewayRevelation.corpus,
    };
    return new Corpus(corpusOptions);
  }

  async _proselytizeFalseProphet (gatewayRevelation: Object, corpus: Corpus, upstream: Prophet):
      Promise<Prophet> {
    let falseProphetOptions;
    try {
      falseProphetOptions = {
        name: "Inspire FalseProphet",
        corpus,
        upstream,
        schema: EngineContentAPI.schema,
        logger: this.getLogger(),
        ...await gatewayRevelation.falseProphet,
      };
      const falseProphet = new FalseProphet(falseProphetOptions);
      this.warnEvent(`Proselytized FalseProphet ${falseProphet.debugId()}`,
          ...(!this.getDebugLevel() ? [] : [", with:",
            "\n\tfalseProphetOptions:", falseProphetOptions,
            "\n\tfalseProphet:", falseProphet,
          ]),
      );
      return falseProphet;
    } catch (error) {
      throw this.wrapErrorEvent(error, "proselytizeFalseProphet",
          "\n\tfalseProphetOptions:", falseProphetOptions,
          "\n\tupstream:", upstream);
    }
  }

  async _attachPlugins (gatewayRevelation: Object) {
    for (const plugin of await gatewayRevelation.plugins) this.attachPlugin(await plugin);
  }

  attachPlugin (plugin: Object) {
    this.warnEvent(`Attaching plugin '${plugin.name}':`, plugin);
    for (const schemePlugin of Object.values(plugin.schemes || {})) {
      this.nexus.addSchemePlugin(schemePlugin);
    }
    for (const Decoder: any of Object.values(plugin.decoders || {})) {
      this.scribe.getDecoderArray().addDecoder(new Decoder({ logger: this.getLogger() }));
    }
  }

  async _narratePrologues (prologueRevelation: Object) {
    let prologues;
    let buffers;
    const client = this;
    try {
      this.warnEvent(`Narrating revelation prologues`);
      prologues = await this._loadRevelationEntryPartitionAndPrologues(prologueRevelation);
      this.warnEvent(`Narrated revelation with ${prologues.length} prologues`,
          "\n\tprologue partitions:",
              `'${prologues.map(({ partitionURI }) => String(partitionURI)).join("', '")}'`);
      const ret = await Promise.all(prologues.map(async ({ partitionURI, info }: any) => {
        let eventLog;
        let mediaInfos;
        const connection = await this.falseProphet.acquirePartitionConnection(partitionURI, {
          dontRemoteNarrate: true,
          retrieveMediaContent (mediaId: VRef, mediaInfo: Object) {
            // Blob wasn't found in cache.
            // Return undefined if the requested blob id doesn't match the latest known blob id
            // for this media to silently ignore this retrieve request: the actual request will
            // come later during the narration.
            if (mediaInfo.blobId !== mediaInfos[mediaId.rawId()].mediaInfo.blobId) return undefined;
            // Otherwise this is the request for last known blob, which should have been precached.
            throw new Error(`Cannot find the latest blob of media "${mediaInfo.name
                }" during prologue narration, with blob id "${mediaInfo.blobId}" `);
          },
        });
        if ((await info.commandId) >= 0) {
          throw new Error("Command queues in revelation are not supported yet");
        }
        const eventId = await info.eventId;
        const lastEventId = connection.getLastAuthorizedEventId();
        if ((typeof eventId !== "undefined") && (eventId > lastEventId)) {
          // If no event logs are replayed, we don't need to precache the blobs either, so we delay
          // loading them up to this point.
          this.blobs = this.blobs || ((async () => {
            const resolvedBlobs = (await revelation.blobs) || {};
            for (const [blobId, blobInfoMaybe] of Object.entries(resolvedBlobs || {})) {
              const blobInfo = await blobInfoMaybe;
              if (blobInfo.persistRefCount !== 0) {
                await this.scribe.preCacheBlob(blobId, blobInfo, readRevelationBlobContent);
              }
            }
            return (this.blobs = resolvedBlobs);
          })());
          await this.blobs;
          const { events, medias } = await info.logs;
          eventLog = await events;
          mediaInfos = await medias;
          await connection.narrateEventLog({ eventLog, firstEventId: lastEventId + 1 })/**/;
        }
        return connection;
      }
      ));
      this.warnEvent(`Acquired active connections for all revelation prologue partitions:`,
          "\n\tconnections:", ret.map(connection => [connection.debugId()]));
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, "narratePrologue",
          "\n\tprologue revelation:", prologueRevelation,
          "\n\tprologues:", prologues);
    }
    async function readRevelationBlobContent (blobId: string) {
      if (!buffers) buffers = await revelation.buffers;
      if (typeof buffers[blobId] === "undefined") {
        client.errorEvent("Could not locate precached content for blob", blobId,
            "from revelation buffers", buffers);
        return undefined;
      }
      const container = await buffers[blobId];
      if (typeof container.base64 !== "undefined") return arrayBufferFromBase64(container.base64);
      return container;
    }
  }

  async _loadRevelationEntryPartitionAndPrologues (prologueRevelation: Object) {
    const ret = [];
    try {
      for (const [uri, info] of (Object.entries((await prologueRevelation.partitionInfos) || {}))) {
        ret.push({
          partitionURI: createPartitionURI(uri),
          info: await info,
        });
      }
      if (prologueRevelation.rootPartitionURI) {
        ret.push({
          partitionURI: createPartitionURI(await prologueRevelation.rootPartitionURI),
          isNewPartition: false,
          info: { commandId: -1, eventId: -1, logs: { commands: [], events: [] } },
        });
      } else {
        // These are not obsolete yet, but temporarily disabled.
        if (Array.isArray(prologueRevelation.snapshotEventPaths)) {
          throw new Error("revelation.snapshotEventPaths temporarily disabled");
          /*
          for (const [partitionURIString, snapshotPath] of revelation.snapshotEventPaths) {
            invariantifyString(partitionURIString,
                "revelation.snapshotEventPaths[0]: partition URI string");
            invariantifyString(snapshotPath,
                "revelation.snapshotEventPaths[1]: snapshot event path");
            const snapshotEvent = await request({ url: snapshotPath });
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
        if (prologueRevelation.initialEventPath) {
          throw new Error("revelation.initialEventPath temporarily disabled");
          /*
          // Legacy revelation.
          const initialEvent = await request({ url: revelation.initialEventPath });
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
          "\n\tprologue revelation:", prologueRevelation,
      );
    }
  }
}
