// @flow

import AWSGlobal from "aws-sdk/global";

import cloneDeep from "lodash/cloneDeep";

import Command from "~/valaa-core/command";
import { PartitionURI, getPartitionRawIdFrom } from "~/valaa-core/tools/PartitionURI";
import { dumpObject } from "~/valaa-core/VALK";

import Prophet, { NarrateOptions, ClaimResult, EventCallback } from "~/valaa-prophet/api/Prophet";
import Prophecy from "~/valaa-prophet/api/Prophecy";
import AWSPartitionConnection from "~/valaa-prophet/authority/aws/AWSPartitionConnection";
import AWSRemoteStorageManager from "~/valaa-prophet/authority/aws/AWSRemoteStorageManager";
// eslint-disable-next-line no-duplicate-imports

import { invariantify, Logger, request } from "~/valaa-tools";

type CommandOptions = {
  timed: Object,
}
type CommandEnvelope = {
  partitionId: string,
  command: Object,
  lastEventId: string
}
type CommandResponse = {
  partitionId: string,
  eventId: number,
  event: Object
}

let _currentGlobalAWSCredentials;
function _updateAWSGlobalCredentials (credentials: Object) {
  if (!credentials) return;
  const { IdentityPoolId, region } = credentials;
  if (!_currentGlobalAWSCredentials
      || (_currentGlobalAWSCredentials.IdentityPoolId !== IdentityPoolId)
      || (_currentGlobalAWSCredentials.region !== region)) {
    _currentGlobalAWSCredentials = credentials;
  // FIXME(iridian): Get rid of the global singleton AWSGlobal.config dependency if possible.
    AWSGlobal.config.update({
      region,
      credentials: new AWSGlobal.CognitoIdentityCredentials({ IdentityPoolId })
    });
  }
}

export function createTestUpstream (config: Object = {
  partitionAuthorityURI: "valaa-test:",
  api: { endpoint: null, verifyEndPoint: null },
  iot: { endpoint: null },
  s3: { pendingBucketName: null, liveBucketName: null },
  credentials: null,
  test: true,
  noconnect: true,
}) {
  const name = "Test AWSAuthorityProxy";
  return new AWSAuthorityProxy({ name, console, config });
}

export default class AWSAuthorityProxy extends Prophet {
  config: Object;
  name: string;
  connectedPartitions = [];
  middleware: Array<Function> = [];
  _storageManager: AWSRemoteStorageManager;

  constructor ({ name, logger, config }: { name: string, config: Object, logger: Logger }) {
    super({ name, logger, upstream: null });
    this.logEvent(`Upstream to '${config.api.endpoint}' being created.`);
    this.config = config;
    this.config.api.commandURL = `${this.config.api.endpoint}/commands`;

    _updateAWSGlobalCredentials(config.credentials);

    if (!AWSAuthorityProxy._storageManager) {
      AWSAuthorityProxy._storageManager = new AWSRemoteStorageManager(config);
    }
    this._storageManager = AWSAuthorityProxy._storageManager;
  }

  /**
   * Register a middleware function with the AWSAuthorityProxy. When claming a command, each
   * middleware function will get to run on the command envelope.
   * @param {Function} middleware
   */
  addMiddleware (middleware: Function) {
    this.middleware.push(middleware);
  }

  /**
   * Unregister the given middleware function
   * @param {Function} middleware
   */
  removeMiddleware (middleware: Function) {
    const index = this.middleware.indexOf(middleware);
    if (index > -1) this.middleware.splice(index, 1);
  }

  /**
   * Allows each registered middleware function to modify the command
   * envelope in the order that the middlewares were registered.
   * @param {CommandEnvelope} envelope The envelope to modify
   */
  async applyMiddleware (envelope: CommandEnvelope) {
    let ret = envelope;
    for (const m of this.middleware) {
      const mutatedRet = await m(this, ret);
      if (mutatedRet && typeof mutatedRet === "object") ret = mutatedRet;
    }
    return ret;
  }

  claim (command: Command, options: CommandOptions = {}): ClaimResult { // eslint-disable-line
    try {
      const partitionList = [];
      for (const [partitionId, { partitionAuthorityURI, eventId }]
          of Object.entries(command.partitions)) {
        if (partitionAuthorityURI !== this.config.partitionAuthorityURI) {
          throw new Error(`multi-authority commands not supported by authority ${
                  this.config.partitionAuthorityURI
              } , command contains sub-action(s) modifying another authority: ${
              partitionAuthorityURI}`);
        }
        partitionList.push({ partitionId, lastEventId: eventId - 1 });
      }

      const finalEvent = this._queueCommandEnvelopePersist({ partitionList, command });
      return { prophecy: new Prophecy(command), getFinalEvent: () => finalEvent };
    } catch (error) {
      throw this.wrapErrorEvent(error, "claim()", "\n\tcommand:", ...dumpObject(command));
    }
  }

  _uploadQueue: Object[] = [];

  _queueCommandEnvelopePersist (envelope: CommandEnvelope) {
    const queueEntry = { envelope };
    this._uploadQueue.push(queueEntry);
    queueEntry.persistProcess = this._persistCommandEnvelope(queueEntry);
    return queueEntry.persistProcess;
  }

  async _persistCommandEnvelope (queueEntry: Object) {
    try {
      const commandJSON = JSON.stringify(await this.applyMiddleware(queueEntry.envelope));
      if (commandJSON.length > 128000) {
        throw new Error("Command too large to send. IoT limit is 128 KB.");
      }
      const index = this._uploadQueue.indexOf(queueEntry);
      if (index > 0) await this._uploadQueue[index - 1].persistProcess;
      if (this._uploadQueue[0] !== queueEntry) {
        throw new Error("persistCommand uploadQueue was flushed before sending command envelope");
      }
      const response: Array<CommandResponse> = await request({
        url: this.config.api.commandURL,
        method: "put",
        contentType: "application/json",
        crossOrigin: true,
        silent: true,
        data: commandJSON,
      });
      for (const { partitionId, eventId } of response) {
        invariantify(eventId === queueEntry.envelope.command.partitions[partitionId].eventId,
            `inconsistent eventId, received '${eventId}' for ${partitionId}, expected '${
                queueEntry.envelope.command.partitions[partitionId].eventId}'`);
      }
      if (this._uploadQueue[0] !== queueEntry) {
        throw new Error(
            "persistCommand request (strangely) succeeded while uploadQueue had been flushed");
      }
      this._uploadQueue.shift();
      return queueEntry.envelope.command;
    } catch (error) {
      const index = this._uploadQueue.indexOf(queueEntry);
      if ((index >= 0) && (index < this._uploadQueue.length)) this._uploadQueue.length = index;
      throw this.wrapErrorEvent((error instanceof Error)
              ? error
              : new Error(error.response), `persistCommandEnvelope`,
          "\n\tqueueEntry:", ...dumpObject(queueEntry),
          "\n\tenvelope:", ...dumpObject(queueEntry.envelope),
          "\n\tcommand:", ...dumpObject(queueEntry.envelope.command),
          "\n\tresponse error:", error.response,
      );
    }
  }

  // Creates a PartitionConnection, makes sure it's ready, and returns it
  async acquirePartitionConnection (partitionURI: PartitionURI,
      initialNarrateOptions: NarrateOptions = {}): Promise<AWSPartitionConnection> {
    const partitionConnection = await this._createPartitionConnection(
        getPartitionRawIdFrom(partitionURI), initialNarrateOptions.callback);

    // Fetch, connect, subscribe and set callbacks
    if (!this.config.noconnect && !initialNarrateOptions.noConnect) {
      await partitionConnection.connect(initialNarrateOptions);
    }
    return partitionConnection;
  }

  async _createPartitionConnection (partitionRawId: string, callback: EventCallback):
      Promise<AWSPartitionConnection> {
    const partitionInfo = await this._fetchPartitionInfo(partitionRawId);

    const partitionConfig = cloneDeep(this.config);
    // Append partition config to current Upstream config
    partitionConfig.partition = {
      id: partitionRawId,
      endpoint: partitionInfo.endpoint,
      topic: partitionInfo.topic
    };

    // Initialize the connection object
    const partitionConnection = new AWSPartitionConnection(partitionConfig, this, callback);
    partitionConnection.acquireConnection();
    return partitionConnection;
  }

  async _fetchPartitionInfo (partitionRawId: string): Object {
    // TODO(ikajaste): this will eventually fetch the partition info using this.upstreamURL
    return {
      // Providing endpoint directly in config is a temporary shortcut during development
      endpoint: this.config.api.endpoint,
      topic: `partition/full/${partitionRawId}`
    };
  }
}
