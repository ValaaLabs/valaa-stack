// @flow

import type Command from "~/valaa-core/command";
import { createValaaURI } from "~/valaa-core/tools/PartitionURI";
import { VRef } from "~/valaa-core/ValaaReference";

import PartitionConnection from "~/valaa-prophet/api/PartitionConnection";
import type Prophet, { NarrateOptions, MediaInfo, RetrieveMediaContent }
    from "~/valaa-prophet/api/Prophet";
import ScribePartitionConnection from "~/valaa-prophet/prophet/ScribePartitionConnection";

import { dumpObject, invariantifyNumber, thenChainEagerly } from "~/valaa-tools";


/**
 * The nexus connection object, which consolidates the local scribe connections and the possible
 * remote connection.
 *
 * Unconditionally relies on scribe connection: any failures (like running over quota) will flow
 * through to front-end.
 * Unconditionally relies on remote connection also.
 * TODO(iridian): The remote connection must not be relied upon, but reconnection support needs to
 * be added.
 *
 * @export
 * @class OraclePartitionConnection
 * @extends {PartitionConnection}
 */
export default class OraclePartitionConnection extends PartitionConnection {
  _lastAuthorizedEventId: number;
  _downstreamTruthQueue: Object[];
  _retrieveRemoteMediaContent: ?RetrieveMediaContent;

  constructor (options: Object) {
    super(options);
    this._lastAuthorizedEventId = -1;
    this._downstreamTruthQueue = [];
    this._isConnected = false;
  }

  getScribeConnection (): ScribePartitionConnection {
    return this._upstreamConnection;
  }

  isConnected (): boolean {
    return this._isConnected;
  }

  /**
   * Asynchronoush operation which activates the connection to the Scribe and loads its metadatas,
   * initiates the remote connections and narrates any requested events before finalizing.
   *
   * The initial narration looks for the requested events in following order:
   * 1. initialNarrateOptions.eventLog
   * 2. scribe in-memory and IndexedDB caches
   * 3. remote connection.narrateEventLog (only if initialNarrateOptions.lastEventId is specified)
   *
   * If lastEventId is not specified, all the explicit eventLog and local cache events (starting
   * from the optional firstEventId) are narrated.
   *
   *
   * @param {NarrateOptions} initialNarrateOptions
   *
   * @memberof OraclePartitionConnection
   */
  async connect (initialNarrateOptions: NarrateOptions) {
    const onConnectData = {
      ...initialNarrateOptions,
    };
    this._retrieveRemoteMediaContent = this._decorateOnConnectRetrieveMediaContent(onConnectData);
    let ret;
    try {
      if (this.getDebugLevel()) {
        this.warnEvent("\n\tBegun initializing connection with options", initialNarrateOptions);
      }
      const scribeConnection = await this._prophet._upstream
          .acquirePartitionConnection(this.partitionURI(),
              { callback: this._onConfirmTruth.bind(this, "scribeUpstream") });
      this.transferIntoDependentConnection("scribeUpstream", scribeConnection);
      this.setUpstreamConnection(scribeConnection);

      // Handle step 1. of the acquirePartitionConnection optimistic full narration logic defined
      // in PartitionConnection.js and begin Start scribe event log narration (which is likely to
      // be I/O bound) in parallel to the authority proxy/connection creation.
      const localNarrationProcess = this.narrateEventLog(initialNarrateOptions);

      const remoteConnection = this._connectToAuthorityProphet(onConnectData);

      ret = await localNarrationProcess;

      const remoteNarrationProcess = remoteConnection
          && !initialNarrateOptions.dontRemoteNarrate
          && ((async () =>
        (await remoteConnection).narrateEventLog(
            { firstEventId: this._lastAuthorizedEventId + 1 }))());

      // Handle step 2 of the optimistic full narration logic after if the initial local narration
      // didn't find any events.
      if (remoteNarrationProcess && !(ret.eventLog || []).length
          && !(ret.scribeEventLog || []).length && !(ret.scribeCommandQueue || []).length) {
        Object.assign(ret, await remoteNarrationProcess);
      }

      const actionCount = Object.values(ret).reduce(
          (acc, log) => acc + (Array.isArray(log) ? log.length : 0), 0);
      if (!actionCount && (onConnectData.createNewPartition === false)) {
        throw new Error(`No actions found when connecting to an existing partition '${
            this.partitionURI().toString()}'`);
      } else if (actionCount && (onConnectData.createNewPartition === true)) {
        throw new Error(`Existing actions found when trying to create a new partition '${
            this.partitionURI().toString()}'`);
      }

      onConnectData.mediaRetrievalStatus = this._analyzeOnConnectMediaRetrievals(onConnectData);
      if (onConnectData.mediaRetrievalStatus.latestFailures.length
          && (onConnectData.requireLatestMediaContents !== false)) {
        throw new Error(`Failed to connect to partition: encountered ${
                onConnectData.mediaRetrievalStatus.latestFailures.length
            } latest media content retrieval failures (and acquirePartitionConnection.${
            ""}options.requireLatestMediaContents does not equal false).`);
      }

      this._isConnected = true;
      if (this.getDebugLevel()) {
        this.warnEvent("\n\tDone initializing connection with options", initialNarrateOptions,
            "\n\tinitial narration:", ret,
            "\n\tmedia retrievals:", onConnectData.mediaRetrievalStatus);
      }
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, "connect",
          "\n\tonConnectData:", onConnectData,
          "\n\tcurrent ret:", ret);
    } finally {
      this._retrieveRemoteMediaContent = onConnectData.retrieveMediaContent;
    }
  }

  static maxOnConnectRetrievalRetries = 3;

  /**
   * Creates and returns a connect-process decorator for the retrieveMediaContent callback of this
   * connection. This decorator manages all media retrievals for the duration of the initial
   * narration. Intermediate Media contents are potentially skipped so that only the latest content
   * of each Media is available.
   * The retrieval of the latest content is attempted maxOnConnectRetrievalRetries times.
   *
   * @param {Object} onConnectData
   * @returns
   *
   * @memberof OraclePartitionConnection
   */
  _decorateOnConnectRetrieveMediaContent (onConnectData: Object) {
    const retrievals = onConnectData.retrievals = {};
    return (mediaId: VRef, mediaInfo: Object) => {
      const mediaRetrievals = retrievals[mediaId.rawId()]
          || (retrievals[mediaId.rawId()] = { history: [], pendingRetrieval: undefined });
      const thisRetrieval = {
        process: undefined, content: undefined, retries: 0, error: undefined, skipped: false,
      };
      mediaRetrievals.history.push(thisRetrieval);
      return (async () => {
        try {
          if (mediaRetrievals.pendingRetrieval) await mediaRetrievals.pendingRetrieval.process;
        } catch (error) {
          // Ignore any errors of earlier retrievals.
        }
        while (thisRetrieval === mediaRetrievals.history[mediaRetrievals.history.length - 1]) {
          try {
            thisRetrieval.process = onConnectData.retrieveMediaContent(mediaId, mediaInfo);
            mediaRetrievals.pendingRetrieval = thisRetrieval;
            thisRetrieval.content = await thisRetrieval.process;
            return thisRetrieval.content;
          } catch (error) {
            ++thisRetrieval.retries;
            const description = `connect/retrieveMediaContent(${
                mediaInfo.name}), ${thisRetrieval.retries}. attempt`;
            if (thisRetrieval.retries <= OraclePartitionConnection.maxOnConnectRetrievalRetries) {
              this.warnEvent(`${description} retrying after ignoring an exception: ${
                  error.originalMessage || error.message}`);
            } else {
              thisRetrieval.error = this.wrapErrorEvent(error, description,
                  "\n\tonConnectData:", ...dumpObject(onConnectData),
                  "\n\tmediaId:", mediaId.rawId(),
                  "\n\tmediaInfo:", ...dumpObject(mediaInfo),
                  "\n\tmediaRetrievals:", ...dumpObject(mediaRetrievals),
                  "\n\tthisRetrieval:", ...dumpObject(thisRetrieval),
              );
              return undefined;
            }
          } finally {
            if (mediaRetrievals.pendingRetrieval === thisRetrieval) {
              mediaRetrievals.pendingRetrieval = null;
            }
          }
        }
        thisRetrieval.skipped = true;
        return undefined;
      })();
    };
  }

  _analyzeOnConnectMediaRetrievals ({ retrievals }: Object) {
    const ret = {
      medias: Object.keys(retrievals).length,
      successfulRetrievals: 0,
      overallSkips: 0,
      overallRetries: 0,
      intermediateFailures: [],
      latestFailures: [],
    };
    for (const mediaRetrievals of Object.values(retrievals)) {
      mediaRetrievals.history.forEach((retrieval, index) => {
        if (typeof retrieval.content !== "undefined") ++ret.successfulRetrievals;
        if (retrieval.skipped) ++ret.overallSkips;
        ret.overallRetries += retrieval.retries;
        if (retrieval.error) {
          if (index + 1 !== mediaRetrievals.history.length) {
            ret.intermediateFailures.push(retrieval.error);
          } else {
            ret.latestFailures.push(retrieval.error);
          }
        }
      });
    }
    return ret;
  }

  _connectToAuthorityProphet (onConnectData: Object) {
    const authorityProphetCandidate = this._prophet._authorityNexus
        .obtainAuthorityProphetOfPartition(this.partitionURI());
    if (!authorityProphetCandidate) return undefined;
    return Promise.resolve(authorityProphetCandidate).then(async (authorityProphet: Prophet) => {
      const remoteConnection = await authorityProphet
          .acquirePartitionConnection(this.partitionURI(),
              { callback: this._onConfirmTruth.bind(this, "remoteUpstream"), noConnect: true });
      this.transferIntoDependentConnection("remoteUpstream", remoteConnection);
      onConnectData.retrieveMediaContent
          = remoteConnection.readMediaContent.bind(remoteConnection);
      await remoteConnection.connect();
      return remoteConnection;
    });
  }

  async narrateEventLog (options: NarrateOptions = {}): Promise<any> {
    let currentFirstEventId = options.firstEventId;
    const ret = {};
    try {
      const isPastLastEvent = (candidateEventId) =>
          (typeof candidateEventId !== "undefined") &&
          (typeof options.lastEventId !== "undefined") &&
          (candidateEventId > options.lastEventId);
      const rawId = this.partitionRawId();
      const explicitEventLogNarrations = [];
      for (const event of (options.eventLog || [])) {
        const eventId = event.partitions[rawId].eventId;
        invariantifyNumber(eventId, `event.partitions[${rawId}].eventId`, {}, "\n\tevent:", event);
        if (typeof currentFirstEventId !== "undefined") {
          if ((eventId < currentFirstEventId) || isPastLastEvent(eventId)) continue;
          if (eventId > currentFirstEventId) {
            throw new Error(`got eventId ${eventId} while narrating explicit eventLog, expected ${
                currentFirstEventId} (eventlog ids must be monotonous and start from firstEventId`);
          }
        }
        explicitEventLogNarrations.push(options.callback
            ? options.callback(event)
            : this._onConfirmTruth("explicitEventLog", event));
        currentFirstEventId = eventId + 1;
      }
      if (explicitEventLogNarrations.length) {
        ret.explicitEventLog = await Promise.all(explicitEventLogNarrations);
      }
      if (!isPastLastEvent(currentFirstEventId)) {
        Object.assign(ret, await super.narrateEventLog({
          ...options,
          firstEventId: currentFirstEventId,
          commandCallback: options.commandCallback || (!options.callback
              && this._prophet._repeatClaimToAllFollowers.bind(this._prophet))
        }));
      }
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, "narrateEventLog()",
          "\n\toptions:", options,
          "\n\tcurrentFirstEventId:", currentFirstEventId,
          "\n\tcurrent ret:", ret);
    }
  }

  async _onConfirmTruth (originName: string, authorizedEvent: Object): Promise<Object> {
    const partitionData = authorizedEvent.partitions &&
        authorizedEvent.partitions[this.partitionRawId()];
    let lastAuthorizedEventId;
    try {
      if (!partitionData) {
        throw new Error(`authorizedEvent is missing partition info for ${this.debugId()}`);
      }
      lastAuthorizedEventId = this._lastAuthorizedEventId;
      const pendingIndex = partitionData.eventId - lastAuthorizedEventId - 1;
      if (pendingIndex >= 0 && !this._downstreamTruthQueue[pendingIndex]) {
        this._downstreamTruthQueue[pendingIndex] = {
          event: authorizedEvent,
          eventId: partitionData.eventId,
          finalizers: this.getScribeConnection().createEventFinalizers(
              authorizedEvent, partitionData.eventId, this._retrieveRemoteMediaContent),
        };
        const pendingMultiPartitionEvent = await this._unwindSinglePartitionEvents();
        if (pendingMultiPartitionEvent) {
          this._prophet._tryConfirmPendingMultiPartitionTruths(pendingMultiPartitionEvent);
        }
      }
      return authorizedEvent;
    } catch (error) {
      throw this.wrapErrorEvent(error, `_onConfirmTruth('${originName}')`,
          "\n\toriginName:", originName,
          "\n\teventId:", partitionData && partitionData.eventId,
          "\n\tauthorizedEvent:", ...dumpObject(authorizedEvent),
          "\n\tlastAuthorizedEventId:", lastAuthorizedEventId,
          "\n\toracle:", ...dumpObject(this));
    }
  }

  claimCommandEvent (command: Command) {
    return this.getScribeConnection().claimCommandEvent(command, this._retrieveRemoteMediaContent);
  }

  _preAuthorizeCommand = (preAuthorizedEvent: Object) =>
      this._onConfirmTruth("preAuthorizer", preAuthorizedEvent)

  /**
   * @returns the next pending event if it exists and is thus a multipartition event. This event
   * is still in the pending queue.
   *
   * @memberof OraclePartitionConnection
   */
  async _unwindSinglePartitionEvents () {
    while (this._downstreamTruthQueue[0] && !this._downstreamTruthQueue[0]._locked) {
      if (Object.keys(this._downstreamTruthQueue[0].event.partitions || {}).length > 1) {
        return this._downstreamTruthQueue[0].event;
      }
      const entry = await this._takeNextPendingDowstreamTruth();
      this._prophet._confirmTruthToAllFollowers(entry.event, entry.purgedCommands);
    }
    return undefined;
  }

  _nextPendingDownstreamTruth () {
    const entry = this._downstreamTruthQueue[0];
    return entry && !entry._locked && entry.event;
  }

  _nextPendingDownstreamTruthId () {
    const entry = this._downstreamTruthQueue[0];
    return entry && !entry._locked && entry.eventId;
  }

  async _takeNextPendingDowstreamTruth (lockButDontRegisterYet: boolean = false) {
    const entry = this._downstreamTruthQueue[0];
    entry._locked = true;
    const result = await this.getScribeConnection().recordTruth(entry, this._preAuthorizeCommand);
    if (result) entry.purgedCommands = result.purgedCommands;
    else {
      // else what?
    }
    try {
      await Promise.all(entry.finalizers.map(finalize =>
          finalize({ retryTimes: 4, delayBaseSeconds: 5 }))); // last retry after 30 secs
    } catch (error) {
      this.outputErrorEvent(this.wrapErrorEvent(error, `_takeNextPendingDownstreamTruth`,
          "\n\t",
          "\n\t-----------------------------------------------------------------------------------",
          "\n\t--WARNING--WARNING--WARNING--WARNING--WARNING--WARNING--WARNING--WARNING--WARNING--",
          "\n\t-----------------------------------------------------------------------------------",
          "\n\t- Media retrieval failed, event log playback CONTINUES, however                   -",
          "\n\t- some Media MIGHT NOT BE IMMEDIATELY AVAILABLE                                   -",
          "\n\t- affected partition:", this.getName(), this.partitionRawId(),
          "\n\t-----------------------------------------------------------------------------------",
          "\n\t-----------------------------------------------------------------------------------",
          "\n\t",
      ));
    }
    if (!lockButDontRegisterYet) this._registerNextPendingDownstreamTruth();
    return entry;
  }

  _registerNextPendingDownstreamTruth () {
    const entry = this._downstreamTruthQueue.shift();
    this._lastAuthorizedEventId = entry.eventId;
    return entry;
  }

  _unlockNextPendingDownstreamTruth () {
    const entry = this._downstreamTruthQueue[0];
    if (entry) entry._locked = false;
  }


  // Coming from downstream: tries scribe first, otherwise forwards the request to authority.
  // In latter case forwards the result received from authority to Scribe for caching.
  readMediaContent (mediaId: VRef, mediaInfo?: MediaInfo): any {
    let ret;
    try {
      const actualMediaInfo = mediaInfo || this.getScribeConnection().getMediaInfo(mediaId);
      if (!actualMediaInfo.blobId && !actualMediaInfo.sourceURL) {
        return undefined;
      }
      ret = super.readMediaContent(mediaId, mediaInfo);
      if (typeof ret !== "undefined") return ret;
      if (!actualMediaInfo.blobId) {
        const sourceURI = createValaaURI(actualMediaInfo.sourceURL);
        // TODO(iridian): Implement schema-based request forwarding to remote authorities
        // TODO(iridian): Implement straight mediaInfo.sourceURL retrieval if the field is
        // present, using actualMediaInfo.type/subtype as the request ContentType.
        throw new Error(`direct retrieval not implemented for mediaInfo.sourceURL '${
            sourceURI.toString()}'`);
      }
      if (!this._retrieveRemoteMediaContent) {
        throw new Error(`Could not locate media content in Scribe and ${
          ""}OraclePartitionConnection._retrieveRemoteMediaContent is not defined`);
      }
      ret = this._retrieveRemoteMediaContent(mediaId, actualMediaInfo);
      // Store the content to Scribe as well (but not remote): dont wait for completion
      thenChainEagerly(ret, (content) =>
          this.prepareBlob(content, actualMediaInfo, { noRemotePersist: true }));
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, `readMediaContent(${
              (mediaInfo && mediaInfo.name) ? `'${mediaInfo.name}'` : `unnamed media`})`,
          "\n\tmediaId:", mediaId,
          "\n\tmediaInfo:", mediaInfo,
          "\n\tresult candidate:", ret);
    }
  }

  // Coming from downstream: tries scribe first, otherwise forwards the request to authority.
  getMediaURL (mediaId: VRef, mediaInfo?: MediaInfo): any {
    let ret;
    try {
      const actualMediaInfo = mediaInfo || this.getScribeConnection().getMediaInfo(mediaId);
      if (!actualMediaInfo.blobId) {
        return undefined;
      }
      ret = super.getMediaURL(mediaId, mediaInfo);
      if (typeof ret !== "undefined") return ret;
      if (!actualMediaInfo.blobId) {
        const sourceURI = createValaaURI(actualMediaInfo.sourceURL);
        if (sourceURI.protocol === "http:" || sourceURI.protocol === "https:") {
          return actualMediaInfo.sourceURL;
        }
        // TODO(iridian): Implement schema-based request forwarding to remote authorities
        throw new Error(`schema-based mediaInfo.sourceURL's not implemented, got '${
            sourceURI.toString()}'`);
      }
      const remoteConnection = this.getDependentConnection("remoteUpstream");
      if (!remoteConnection) {
        throw new Error(`OraclePartitionConnection has no remote authority connection specified ${
            ""} and could not locate local media URL from Scribe`);
      }
      return remoteConnection.getMediaURL(mediaId, actualMediaInfo);
    } catch (error) {
      throw this.wrapErrorEvent(error, `getMediaURL(${
              (mediaInfo && mediaInfo.name) ? `'${mediaInfo.name}'` : `unnamed media`})`,
          "\n\tmediaId:", mediaId,
          "\n\tmediaInfo:", mediaInfo,
          "\n\tresult candidate:", ret);
    }
  }

  // Coming from downstream: stores Media content in Scribe and uploads it to possible remote
  // uploads pool.
  prepareBlob (content: any, mediaInfo: Object, { noRemotePersist }: any = {}):
      { contentId: string, persistProcess: ?Promise<any> } {
    let ret;
    try {
      ret = this.getScribeConnection().prepareBlob(content, mediaInfo);
      const remoteConnection = !noRemotePersist && this.getDependentConnection("remoteUpstream");
      if (remoteConnection) {
        const remoteMediaInfo = { ...(mediaInfo || {}), blobId: ret.contentId };
        ret.remotePersistProcess =
            remoteConnection.prepareBlob(ret.buffer, remoteMediaInfo)
                .persistProcess;
      }
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, `prepareBlob()`,
          "\n\tmediaInfo:", ...dumpObject(mediaInfo),
          "\n\tscribe return value:", ...dumpObject(ret),
      );
    }
  }
}
