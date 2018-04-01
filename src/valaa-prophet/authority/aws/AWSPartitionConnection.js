// @flow

import AWSGlobal from "aws-sdk/global";
// $FlowSupress (required module not found)
import AWSMqtt from "aws-mqtt";
import { v4 as uuid } from "uuid";

import Command from "~/valaa-core/command";
import { createPartitionURI } from "~/valaa-core/tools/PartitionURI";
import { VRef } from "~/valaa-core/ValaaReference";

import PartitionConnection from "~/valaa-prophet/api/PartitionConnection";
import type { EventCallback, EventData, MediaInfo, NarrateOptions }
    from "~/valaa-prophet/api/Prophet";
import type AWSAuthorityProxy from "~/valaa-prophet/authority/aws/AWSAuthorityProxy";
// $FlowSupress (required module not found)

import request from "~/valaa-tools/request";

type PartitionConfiguration = {
  partitionAuthorityURI: string,
  api: { endpoint: string; },
  iot: { endpoint: string; },
  credentials: {
    region: string,
    IdentityPoolId: string,
    accessKeyId: string,
    secretAccessKey: string,
  },
  partition: {
    id: string,
    eventURL: string,
    endpoint: string
  },
}

type EventEnvelope = {
  partitionId: string,
  eventId: number,
  event: EventData,
}

export default class AWSPartitionConnection extends PartitionConnection {
  callback: EventCallback;
  connection: Object; // This is an mqtt client object
  manager: AWSAuthorityProxy; // Prophet
  config: PartitionConfiguration;
  clientId: string;
  name: string;
  _lastEventId = 0;
  _nextPlaybackId = 0;
  _ready = false;
  _pendingEvents = {};

  constructor (
      config: PartitionConfiguration,
      manager: AWSAuthorityProxy,
      callback: EventCallback) { // eslint-disable-line padded-blocks
    super({
      prophet: manager,
      partitionURI: createPartitionURI(config.partitionAuthorityURI, config.partition.id),
    });
    // clientId to register with MQTT broker. Need to be unique per client
    this.manager = manager;
    this.clientId = `mqtt-client-${uuid()}`;
    this.config = config;

    this.config.partition.eventURL = `${this.config.partition.endpoint}/events`;
    if (typeof callback === "function") {
      this.callback = callback;
    } else {
      this.warnEvent("AWSPartitionConnection created without a callback.");
      this.callback = () => { this.warnEvent("Event received to an undfined callback!"); };
    }
  }

  async connect (initialNarrateOptions: NarrateOptions) {
    return this._doubleSync(initialNarrateOptions);
  }

  // Perform a double sync - register to receive new events for a partition, and fetch the backlog
  async _doubleSync (narrateOptions: NarrateOptions) {
    await this._registerForEvents();
    if (narrateOptions) await this.narrateEventLog(narrateOptions);
    this._ready = true;
  }

  // Fetches recent events from partition, and delivers them to the EventEnvelope unpacker,
  // then ultimately as Events to the callback funcion.
  // Returns count of events.
  // Callback can also be overriden, if you need to get the events (EventEnvelopes) directly for
  // some reason. In that case the events will be delivered directly and any internal processing
  // of the envelopes skipped.
  async narrateEventLog ({
    callback = this._receiveEventEnvelope.bind(this), firstEventId/* , lastEventId, noSnapshots */
  }: NarrateOptions = {}) {
    if (this.config.noconnect) {
      throw new Error(`Can't narrate through a noconnect partition connection.`);
    }
    if (typeof firstEventId !== "undefined") this._nextPlaybackId = firstEventId;

    // fetches the events
    let parameters: { partitionId: string, lastEvaluatedKey?: number } = {
      partitionId: this.config.partition.id,
      lastEvaluatedKey: (firstEventId || 0) - 1,
    };
    const ret = { remoteLog: [] };

    let previousLoopCondition;
    try {
      do {
        const data = await request({
          url: this.config.partition.eventURL,
          method: "get",
          crossOrigin: true,
          data: parameters
        });
        // todo(ikajaste): handle failures better
        // todo(ikajaste): validate JSON against expected response
        for (const item of (data.Items || [])) {
          for (const callbackEvent of (callback(item) || [])) {
            ret.remoteLog.push(callbackEvent);
          }
        }

        parameters = { ...parameters, lastEvaluatedKey: undefined };
        if ("LastEvaluatedKey" in data) {
          // The result has been paginated, need to fetch more
          this.logEvent("Fetching more, last event was:", data.LastEvaluatedKey.eventId);
          parameters.lastEvaluatedKey = data.LastEvaluatedKey.eventId;
          if (parameters.lastEvaluatedKey === previousLoopCondition) {
            this.errorEvent("Paginated event fetching seems to be repeating the same query.");
            throw new Error("Paginated event fetching seems to be repeating the same query.");
          }
          previousLoopCondition = parameters.lastEvaluatedKey;
        }
        // repeat query if capped
      } while (parameters.lastEvaluatedKey);
      ret.remoteLog = await Promise.all(ret.remoteLog);
      return ret;
    } catch (error) {
      // todo(ikajaste): Maybe retry here?
      throw this.wrapErrorEvent(error, `narrateEventLog()`,
          "\n\tparameters:", parameters,
          "\n\terror response:", error.response);
    }
  }

  // TODO(ikajaste): This might not be needed, but it feels like it might be useful later
  // Check whether initial sync is done, and IoT is connected to receive events
  isReady () {
    return this._ready;
  }

  // Check whether MQTT client is connected to IoT
  isConnected () {
    // TODO(ikajaste): It's possible this acutally returns true, make sure later
    return this.connection && this.connection.connected;
  }

  // Sends a given command within a command envelope to the API endpoint
  async sendCommand (command: Command) {
    if (this.config.noconnect) {
      throw new Error(`Can't sendCommand through a noconnect partition connection.`);
    }
    const partitionRawId = this.config.partition.id;

    // Send the command to manager for delivery, appending partition id and last known event
    if (!command.partitions) {
      command.partitions = { [partitionRawId]: { eventId: this._lastEventId + 1 } };
    }
    const persistedEvent = await this.manager.claim(command).getFinalEvent();
    this._lastEventId = persistedEvent.partitions[partitionRawId].eventId;
    return this._lastEventId;
  }


  // Note: Requests a partition wipe! Use with caution!
  async sendPartitionDeleteCommand (test: boolean = false) {
    if (this.config.noconnect) {
      throw new Error(`Can't sendPartitionDeleteCommand through a noconnect partition connection.`);
    }

    let targetURL;
    let method;
    if (!test) {
      // This is the correct implementation always, but for some reason
      // the reqwest library, or something, fails at OPTIONS cors pre-flight,
      // when called from jest, when making it before a DELETE request. Yeah, weird.
      targetURL = `${this.config.partition.eventURL}?partitionId=${this.config.partition.id}`;
      method = "delete";
    } else {
      // ... so when doing tests, we use an alternate method as a workaround
      targetURL = `${this.config.partition.endpoint}/deletepartition?partitionId=${
          this.config.partition.id}`;
      method = "get";
    }

    this.logEvent(`DEBUG: Requesting deletion for partition "${this.config.partition.id}" from ${
        targetURL}`);
    try {
      const response = await request({
        url: targetURL,
        method: method, // eslint-disable-line object-shorthand
        crossOrigin: true,
        timeout: 14000,
      });
      if (response !== true) { // "true" is interpreted into a boolean
        this.errorEvent(`Probably failed to delete partition ${this.config.partition.id}`);
        this.errorEvent(`Expected true as response, got: "${response}"`);
        throw new Error("Probably failed to delete partition - wrong response");
      }
      return response;
    } catch (error) {
      this.errorEvent(`Failed to delete partition ${this.config.partition.id}`);
      this.errorEvent(`HTTP Request failed, returning: "${error.response}"`);
      throw error;
    }
  }

  // Disconnect MQTT from IoT, if connected
  disconnect () {
    if (this.isConnected()) {
      this.logEvent(`Closing IoT connection of client ${this.clientId}`);
      this.connection.end();
      // FIXME(ikajaste): Disconnect does stop events, but fails somehow - the connection remains:
      // (this.connection.connected returns true)
    } else {
      // debug
      this.logEvent(`Client ${this.clientId} is not connected, so no need to disconnect.`);
    }
  }

  async readMediaContent (mediaId: VRef, mediaInfo: ?MediaInfo): any {
    const whileTrying = (mediaInfo && (typeof mediaInfo.name === "string"))
        ? `while trying to read media '${mediaInfo.name}' content`
        : "while trying to read unnamed media content";
    try {
      if (!mediaInfo) throw new Error(`mediaInfo missing ${whileTrying}`);
      if (!mediaInfo.blobId) throw new Error(`blobId missing ${whileTrying}`);
      return await this._prophet._storageManager.readBlobContentAsMedia(mediaInfo);
    } catch (error) {
      throw this.wrapErrorEvent(error, `readMediaContent(${whileTrying})`,
          "\n\tmediaId:", mediaId,
          "\n\tmediaInfo:", mediaInfo,
      );
    }
  }

  async getMediaURL (mediaId: VRef, mediaInfo?: MediaInfo): any {
    const whileTrying = (mediaInfo && (typeof mediaInfo.name === "string"))
        ? `while trying to get media '${mediaInfo.name}' URL`
        : "while trying to get unnamed media URL";
    try {
      if (!mediaInfo) throw new Error(`mediaInfo missing ${whileTrying}`);
      if (!mediaInfo.blobId) throw new Error(`blobId missing ${whileTrying}`);
      if (!mediaInfo.type || !mediaInfo.subtype) {
        throw new Error(`mime (type/subtype) missing ${whileTrying}`);
      }
      return await this._prophet._storageManager.getBlobURLAsMediaURL(mediaInfo);
    } catch (error) {
      throw this.wrapErrorEvent(error, `getMediaURL(${whileTrying})`,
          "\n\tmediaId:", mediaId,
          "\n\tmediaInfo:", mediaInfo,
      );
    }
  }

  prepareBlob (content: any, mediaInfo?: MediaInfo):
      { contentId: string, persistProcess: ?Promise<any> } {
    const whileTrying = (mediaInfo && (typeof mediaInfo.name !== "string"))
        ? `while trying to prepare media '${mediaInfo.name}' content for persist`
        : "while trying to prepare unnamed media content for persist";
    try {
      if (!mediaInfo) throw new Error(`mediaInfo missing ${whileTrying}`);
      if (!mediaInfo.blobId) throw new Error(`blobId missing ${whileTrying}`);
      return {
        contentId: mediaInfo.blobId,
        persistProcess: this._prophet._storageManager.storeMediaBlobContent(content, mediaInfo),
      };
    } catch (error) {
      throw this.wrapErrorEvent(error, `prepareBlob(${whileTrying})`,
          "\n\tcontent:", { content },
          "\n\tmediaInfo:", mediaInfo,
      );
    }
  }

  getContentPersistProcess (contentId: string) {
    return this._prophet._storageManager.verifyContent(contentId);
  }

  // return value: accepted or not (note: not accepted can be normal operation)
  _receiveEventEnvelope (eventEnvelope: EventEnvelope): boolean {
    // todo(ikajaste): validate JSON
    if (eventEnvelope.partitionId !== this.config.partition.id) {
      this.warnEvent("Event for different partition '", eventEnvelope.partitionId,
          "' received, expected '", this.config.partition.id, "' at client ", this.clientId);
      return false;
    }

    if ((this._pendingEvents[eventEnvelope.eventId] !== undefined)
        || (eventEnvelope.eventId < this._nextPlaybackId)) {
      let eventStatus = "";
      if (this._pendingEvents[eventEnvelope.eventId] !== undefined) {
        eventStatus = "in buffer";
      } else if (eventEnvelope.eventId < this._nextPlaybackId) {
        eventStatus = "assumed delivered";
      }
      // todo(ikajaste): remove overeager debug output
      this.logEvent(`Received duplicate event id ${eventEnvelope.eventId} (${eventStatus}).`);
      // ignore event as duplicate - a normal case
      return false;
    }
    return this._receiveEvent(eventEnvelope.eventId, eventEnvelope.event);
  }

  _receiveEvent (id: number, event: EventData) {
    // todo(ikajaste): validate JSON
    this._pendingEvents[id] = event;
    if (id > this._lastEventId) {
      this._lastEventId = id;
    }
    // Playback this, and all waiting events, to downstream
    const sent = [];
    while (this._pendingEvents[this._nextPlaybackId] !== undefined) {
      // todo(ikajaste): the second callback parameter might eventually not be supported,
      // but activating it for debug now
      sent.push(this.callback(this._pendingEvents[this._nextPlaybackId], this._nextPlaybackId));
      // Once delivered to callback, the event is no longer needed
      delete this._pendingEvents[this._nextPlaybackId];
      this._nextPlaybackId++;
    }
    return sent;
  }

  // return value: accepted or not (note: not accpted can be normal operation)
  _processIoTMessage (message: string) {
    const messageJSON = JSON.parse(message);
    // todo(ikajaste): validate json somehow to be an event envelope
    if (messageJSON.eventId === undefined) {
      this.warnEvent(
          "DEBUG: PartitionConnection received an IoT message that is not an event envelope:",
          message);
      return false;
    }
    return this._receiveEventEnvelope(messageJSON);
  }

  // Connect to IoT if not connected, subscribe to topics, and set up the callbacks
  // for receiving events
  async _registerForEvents (topic: string = this.config.partition.topic) {
    // Connect to IoT
    await this._connectToIoT(topic);

    // Ensure connection (todo: possibly unnecessary)
    if (!this.isConnected()) {
      throw new Error("Not connected to IoT");
    } else {
      this.logEvent(`Subscribing to IoT topic ${topic} on endpoint ${this.config.iot.endpoint}`);
    }

    // Subscribe to IoT topic
    await new Promise((resolve/* , reject */) => {
      this.connection.subscribe(topic);

      resolve(true);
      /*
      this.connection.subscribe(topic, [], (err, granted) => {
        this.logEvent("Succesfully subscribed to topic", granted);
        resolve(true);
      });
      */
    });

    // Set callback function
    this.connection.on("message", (rcvTopic, message) => {
      if (rcvTopic === topic) {
        this._processIoTMessage(message);
      }
    });
    return true;
  }

  async _connectToIoT () {
    if (this.config.noconnect) {
      throw new Error(`Can't connect to IoT through a noconnect partition connection.`);
    }

    // FIXME(iridian): This particular line smells wrong. Below are two commented out sections
    // which indicate the API should be called differently from how it is currently being called.
    // AWS config / IAM auth
    AWSGlobal.config.update(this.config.credentials);

    /*
    // AWS config / Cognito auth
    AWSGlobal.config.region = "eu-west-1";
    AWSGlobal.config.credentials = new AWSGlobal.CognitoIdentityCredentials({
      IdentityPoolId: "eu-west-1:6d6df434-090c-49c4-b00a-a67a29d54c86",
    });
    */

    /*
      // When credentials/aws was removed, this one was moved here. See two sections up.
      import awsCreds from "~/.../credentials/aws";

      const { IdentityPoolId, region } = awsCreds;

      AWSGlobal.config.update({
        region,
        credentials: new AWSGlobal.CognitoIdentityCredentials({ IdentityPoolId })
      });
    */

    // FIXME(iridian): This needs to be mocked in order for the livetest to work
    // the mock should assign: const ws = window.WebSocket
    const ws = WebSocket;

    /*
    this.logEvent("Check AWS Congnito credentials");
    AWSGlobal.config.credentials.get(err => {
      if (err) {
        this.logEvent("Cognito credential aquisition error: " + err);
        return;
      }
      this.logEvent("Congnito credetials succesfully aquired: ",
          AWSGlobal.config.credentials.identityId);
    });
    */

    // AWS MQTT
    this.logEvent("Begin to make IoT connection with client", this.clientId);
    this.connection = AWSMqtt.connect({
      WebSocket: ws,
      region: AWSGlobal.config.region,
      credentials: AWSGlobal.config.credentials,
      endpoint: this.config.iot.endpoint,
      clientId: this.clientId
    });

    await new Promise((resolve) => {
      this.connection.on("disconnect", () => {
        // todo(ikajaste): add a reconnect loop here
        this._ready = false;
        this.logEvent("IoT MQTT connection closed from client", this.clientId);
      });
      // todo(ikajaste): remove the following debug connection termination remote command
      this.connection.on("message", (topic, message) => {
        if (message.toString() === "TERMINATE") {
          this.logEvent("Got a request to terminate IoT MQTT connection from client",
              this.clientId);
        }
      });
      this.connection.on("connect", () => {
        this.logEvent("IoT MQTT connection established with client", this.clientId);
        resolve(true);
      });
    });
    return true;
  }
}
