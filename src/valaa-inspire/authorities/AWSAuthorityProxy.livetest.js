import { v4 as uuid } from "uuid";
import cloneDeep from "lodash/cloneDeep";

import { PartitionURI, createTestPartitionURIFromRawId, getPartitionRawIdFrom }
    from "~/valaa-core/tools/PartitionURI";

import wrapError from "~/valaa-tools/wrapError"; // eslint-disable-line no-unused-vars
import AWSDevUpstreamConfig from "~/valaa-inspire/authorities/AWSDevUpstreamConfig";
import { createTestUpstream } from "~/valaa-prophet/authority/aws/AWSAuthorityProxy";

// NOTE: Live tests are currently a work in progress

// requestLogger can be used to inject more detailed HTTP request debugging
// TODO(ikajaste): Remove this once the OPTIONS/DELETE issue is solved and debug isn't needed

/*
function requestLogger(httpModule){
    var original = httpModule.request
    var o2 = httpModule.serverResponse;
    httpModule.request = function(options, callback){
      console.log("HTTP: ",options.href||options.proto+"://"+options.host+options.path, options.method)
//      console.log(options);
//      console.log('tbdmbuzdg5.execute-api.eu-west-1.amazonaws.com:443::::::::')
      const res = original(options, callback);
//console.log(res.agent.sockets["tbdmbuzdg5.execute-api.eu-west-1.amazonaws.com:443::::::::"]);
//      console.log(res);
//      console.log("End of HTTP");
      return res;
    }
}

requestLogger(require('http'));
*/

// eslint-disable-next-line no-undef
jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000; // individual requests need more time

const activeEnvironments = [];

// eslint-disable-next-line no-undef
afterEach(async (done) => {
  for (const env of activeEnvironments) {
    if (!env.connection) {
      console.error(env);
      continue;
    }
    await env.connection.disconnect();
    // TODO(ikajaste): Currently giving true as a parameter to indicate test mode
    // it causes the delete partition request to be GET instead of DELETE,
    // because it had problems. This should be removed once the problem is solved,
    // as should the alternate post method from AWSPartitionConnection
    if (!env.keepPartition) {
      try {
        await env.connection.sendPartitionDeleteCommand(true); // DELETES all data from partition
      } catch (error) {
        console.warn(`Post-test request to delete partition ${
            env.partitionURI.toString()} failed.`);
      }
    }
  }
  done();
});

function preInit (
    partitionURI: PartitionURI = createTestPartitionURIFromRawId(`test-partition-${uuid()}`)) {
  const env = { partitionURI };

  env.upstream = createTestUpstream(cloneDeep(AWSDevUpstreamConfig));
  activeEnvironments.push(env);

  return env;
}

async function initWithoutConnecting (callback, partitionURI: PartitionURI) {
  const env = preInit(partitionURI);
  env.connection = await env.upstream._createPartitionConnection(
      getPartitionRawIdFrom(env.partitionURI), callback);
  return env;
}

async function init (callback, partitionURI: PartitionURI) {
  const env = preInit(partitionURI);
  env.connection = await env.upstream.acquirePartitionConnection(env.partitionURI, { callback });
  return env;
}

async function initWithCleanup (callback, partitionURI: PartitionURI) {
  const env = preInit(partitionURI);
  env.connection = await env.upstream._createPartitionConnection(
      getPartitionRawIdFrom(env.partitionURI));
  await env.connection.sendPartitionDeleteCommand(true);

  env.connection = await env.upstream.acquirePartitionConnection(env.partitionURI, { callback });
  return env;
}

// In addition to env, return a promise resolving to an event once it's received from IoT
async function initForReceiving (expectedEventId, additionalCallback, partitionURI: PartitionURI) {
  let pResolve;

  const eventReceived = new Promise((resolve) => {
    pResolve = resolve;
  });

  const callback = (event) => {
    if (additionalCallback) {
      additionalCallback(event);
    }
    if (event.id === expectedEventId) {
      console.log(`Callback here! I got the event I expected: ${event.id}`);
      pResolve(event);
    }
  };

  const env = await init(callback, partitionURI);
  return { env, eventReceived };
}
// eslint-disable-next-line no-multiple-empty-lines



describe("AWSAuthorityProxy and AWSPartitionConnection live tests", () => {
  // test ok... ish TODO(ikajaste): improve this to something more meaningful
  it("Receives events from API (LIVE TO TEST PARTITION)", async () => {
    const env = await initWithoutConnecting((event, pbid) => {
      console.log(`Got an event (${pbid}):`, event.id);
    });
    await env.connection.narrateEventLog();
  });

  it("Receives published commands as events via IoT (LIVE TO TEST PARTITION)", async () => {
    const testEventId = uuid();
    const payload = uuid();

    const { env, eventReceived } = await initForReceiving(testEventId);

    await env.connection.sendCommand({ data: payload, id: testEventId });

    expect((await eventReceived).data).toBe(payload);
  });

  it("Only receives events for its own partition via IoT (LIVE TO TEST PARTITION)", async () => {
    const partitions = [];

    partitions.push({ testEventId: uuid(), payload: uuid() });
    partitions.push({ testEventId: uuid(), payload: uuid() });
    partitions.push({ testEventId: uuid(), payload: uuid() });
    partitions.push({ testEventId: uuid(), payload: uuid() });

    for (const part of partitions) {
      const { env, eventReceived } = await initForReceiving(part.testEventId);
      part.env = env;
      part.eventReceived = eventReceived;
    }

    for (const part of partitions) {
      await part.env.connection.sendCommand({ data: part.payload, id: part.testEventId });
    }

    for (const part of partitions) {
      expect((await part.eventReceived).data).toBe(part.payload);
    }
  }, 10000);

  it("Receives posted events from getEvents (LIVE TO TEST PARTITION)", async () => {
    const env = await initWithCleanup();
    const payload = uuid();
    const testEventId = uuid();

    await env.connection.sendCommand({ data: payload, id: testEventId });

    const events = [];
    const narration = await env.connection.narrateEventLog(
        { callback ({ event }) { events.push(event); } });
    expect(narration.remoteLog.length).toEqual(1);
    expect(events.slice(-1)[0].data).toEqual(payload);
  });

  it("Isn't able to send events out of order (LIVE TO TEST PARTITION)", async () => {
    const env = await initWithCleanup();
    const payload = uuid();
    const falsePayload = uuid();
    const testEventId = uuid();

    await env.connection.sendCommand({ data: payload, id: testEventId });
    env.connection._lastEventId--; // intentionally break the previous id

    try {
      await env.connection.sendCommand({ data: falsePayload, id: testEventId });
    } catch (error) {
      console.log("Caught error as expected!", error.originalMessage);
      expect(error.originalMessage).toMatch(/Conflict/);
    }
    // The following would be nicer than the above try-catch, but fails (possibly due to async...):
    // expect(
    //  await env.connection.sendCommand({ data: falsePayload, id: testEventId })
    // ).toThrowError();

    const events = [];
    const narration = await env.connection.narrateEventLog(
        { callback ({ event }) { events.push(event); } });
    expect(narration.remoteLog.length).toEqual(1);
    expect(events.slice(-1)[0].data).toEqual(payload);
  });

  it("Deletes a partition (LIVE TO TEST PARTITION)", async () => {
    const testEventId = uuid();
    const payload = uuid();
    const falsePayload = uuid();
    const falseTestEventId = uuid();
    const e1 = await initForReceiving(falseTestEventId);

    // Add stuff to partition so it's not empty
    await e1.env.connection.sendCommand({ data: falsePayload, id: falseTestEventId });
    // Delete it
    await e1.env.connection.sendPartitionDeleteCommand(true);

    // Make sure the event has been delivered to IoT so it doesn't mess up the later connection
    await e1.eventReceived;

    const events = [];

    // Make a new connection to the same partition, collect all events to events[]
    const e2 = await initForReceiving(
      testEventId,
      (event) => { events.push(event); },
      e1.env.partitionURI
    );

    await e2.env.connection.sendCommand({ data: payload, id: testEventId });
    // Wait for test event to arrive
    await e2.eventReceived;

    expect(events.length).toEqual(1); // Only one event
    expect(events[0].data).toEqual(payload); // The correct event
  });

  it("Receives a significant amount of events", async () => {
    const entries = 50; // amount of entries to test with

    const events = [];
    const sentEvents = [];
    const promises = [];
    const resolves = {};

    // Need to set up Promises so that we can wait for all events to arrive from IoT
    const env = await initWithCleanup((event) => {
      events.push(event);
      resolves[event.id]();
    });

    for (let i = 0; i < entries; i++) {
      const eventId = `id-${uuid()}`;
      const event = { data: uuid(), id: eventId };
      const p = new Promise((resolve) => {
        resolves[eventId] = resolve;
      });
      promises.push(p);
      await env.connection.sendCommand(event);
      sentEvents.push(event);
    }

    // Wait for the IoT events to arrive...
    for (const p of promises) {
      await p;
    }

    const idsSent = sentEvents.map((event) => event.id);
    const idsReceived = events.map((event) => event.id);

    expect(idsReceived).toEqual(idsSent);
  }, 1200000);

  xit("Receives events with pagination (LIVE TO TEST PARTITION)", async () => {
    const entries = 14;
    const payloadsize = 2500; // WARNING: Do NOT increase over 2500, will hit AWS IoT limit of 128k
    // size 2500 = about 90kB

    const events = [];
    const sentEvents = [];
    const promises = [];
    const resolves = {};

    // Need to set up Promises so that we can wait for all events to arrive from IoT
    // Sidenote: any existing events will break this test, because the callback expects
    // there to be a promise to resolve for any event.

    const env = await initWithCleanup((event) => {
      events.push(event);
      resolves[event.id]();
    });

    // Pagination on AWS DB hits at 1 MB of data, so generate events big enough to get paginated
    for (let i = 0; i < entries; i++) {
      let payload = "";
      for (let j = 0; j < payloadsize; j++) {
        payload += uuid() + " "; // eslint-disable-line prefer-template
      }
      const eventId = `id-${uuid()}`;
      const event = { data: payload, id: eventId };
      const p = new Promise((resolve) => {
        resolves[eventId] = resolve;
      });
      promises.push(p);
      await env.connection.sendCommand(event);
      sentEvents.push(event);
    }

    const idsSent = sentEvents.map((event) => event.id);
    const sumSent = sentEvents.reduce((prev, event) => prev + event.data.length, 0);
    // The sum could be stored as a cumulative number as the events are received,
    // but we're only talking about few megabytes of data in memory so this works too.
    console.log(`Sent ${sentEvents.length} events, totaling ${sumSent} chars.`);

    const events2 = [];
     // eslint-disable-next-line no-unused-vars
    const env2 = await init((event) => { events2.push(event); }, env.partitionURI);
    const ids2 = events2.map((event) => event.id);
    const sum2 = events2.reduce((prev, event) => prev + event.data.length, 0);

    // Wait for all IoT events to arrive before comparing
    for (const p of promises) {
      await p;
    }

    const idsReceived = events.map((event) => event.id);
    const sumReceived = events.reduce((prev, event) => prev + event.data.length, 0);

    expect(ids2).toEqual(idsSent);
    expect(ids2).toEqual(idsReceived);
    expect(sum2).toEqual(sumSent);
    expect(sum2).toEqual(sumReceived);
  }, 1200000);
});
